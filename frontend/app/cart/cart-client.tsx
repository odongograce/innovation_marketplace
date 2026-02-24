'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { ShoppingCart, Loader2, CreditCard, Smartphone, CheckCircle, ArrowLeft, ShieldCheck, Trash2 } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { fetchMerchandise, createOrder } from '@/lib/api'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || ''

type Merchandise = {
  id: number
  name: string
  description?: string
  price: number
  stock?: number
  image_url?: string
}

type CartLine = {
  id: number
  quantity: number
  product: Merchandise
}

type CheckoutStep = 'cart' | 'payment' | 'payment-details' | 'confirmation'
type PaymentMethod = 'mpesa' | 'card' | 'cash' | ''

type OrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | string

type OrderDetails = {
  order_id: number
  total?: number
  status?: OrderStatus
  payment_method?: string | null
  checkout_request_id?: string | null
  merchant_request_id?: string | null
  mpesa_receipt?: string | null
}

function moneyKES(v: number) {
  return `${(v || 0).toLocaleString()} KES`
}

function clampQty(qty: number) {
  if (!Number.isFinite(qty)) return 1
  return Math.max(1, Math.floor(qty))
}

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, '')
}

function Stepper({ step }: { step: CheckoutStep }) {
  const steps: Array<{ key: CheckoutStep; label: string }> = [
    { key: 'cart', label: 'Cart' },
    { key: 'payment', label: 'Payment' },
    { key: 'payment-details', label: 'Details' },
    { key: 'confirmation', label: 'Done' },
  ]

  const idx = steps.findIndex((s) => s.key === step)

  return (
    <div className="flex items-center gap-3">
      {steps.map((s, i) => {
        const active = i === idx
        const done = i < idx
        return (
          <div key={s.key} className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full border text-sm font-semibold',
                done && 'bg-primary text-primary-foreground border-primary',
                active && 'border-primary text-primary',
                !active && !done && 'border-border text-muted-foreground'
              )}
              aria-label={s.label}
            >
              {done ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <div className={cn('text-sm', active ? 'text-foreground font-medium' : 'text-muted-foreground')}>
              {s.label}
            </div>
            {i !== steps.length - 1 && <div className="h-px w-6 bg-border" />}
          </div>
        )
      })}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-24">
      <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground" />
      <h2 className="text-2xl font-bold mt-4">Your cart is empty</h2>
      <p className="text-foreground/60 mt-2">Add some great merchandise from the shop.</p>
      <div className="mt-6">
        <a href="/shop">
          <Button>Browse Store</Button>
        </a>
      </div>
    </div>
  )
}

async function fetchOrderStatus(orderId: number, token: string): Promise<OrderDetails> {
  const res = await fetch(`${BASE}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || data?.message || 'Failed to fetch order status')
  return data
}

export default function CartClient() {
  const { toast } = useToast()

  const { cart, updateQuantity, removeFromCart, clearCart } = useCart()
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [products, setProducts] = useState<Merchandise[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productsError, setProductsError] = useState<string | null>(null)

  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart')
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('')

  const [paymentDetails, setPaymentDetails] = useState({
    phone: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  })

  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [orderDetails, setOrderDetails] = useState<OrderDetails | null>(null)

  function notify(title: string, description?: string, variant: 'default' | 'destructive' = 'default') {
    toast({ title, description, variant })
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      const callbackUrl = searchParams.get('callbackUrl') || '/cart'
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
    }
  }, [status, router, searchParams])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        setLoadingProducts(true)
        setProductsError(null)
        const data = await fetchMerchandise()
        if (!alive) return
        setProducts(Array.isArray(data) ? (data as Merchandise[]) : [])
      } catch (e: any) {
        if (!alive) return
        setProducts([])
        setProductsError(e?.message ?? 'Failed to load products')
      } finally {
        if (!alive) return
        setLoadingProducts(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  const items: CartLine[] = useMemo(() => {
    const productById = new Map(products.map((p) => [p.id, p]))
    return cart
      .map((c: any) => {
        const p = productById.get(c.id)
        if (!p) return null
        return { id: c.id, quantity: clampQty(c.quantity), product: p }
      })
      .filter(Boolean) as CartLine[]
  }, [cart, products])

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + (Number(i.product.price) || 0) * i.quantity, 0), [items])
  const shipping = useMemo(() => (items.length > 0 ? 0 : 0), [items])
  const total = useMemo(() => subtotal + shipping, [subtotal, shipping])

  const canCheckout = items.length > 0 && !loadingProducts && !productsError && status === 'authenticated'

  function onQtyMinus(id: number, current: number) {
    updateQuantity(id, clampQty(current - 1))
  }

  function onQtyPlus(id: number, current: number, stock?: number) {
    let next = clampQty(current + 1)
    if (typeof stock === 'number' && stock >= 0) next = Math.min(next, Math.max(1, stock))
    updateQuantity(id, next)
  }

  function onQtyInput(id: number, raw: string, stock?: number) {
    const parsed = clampQty(Number(raw))
    const next = typeof stock === 'number' && stock >= 0 ? Math.min(parsed, Math.max(1, stock)) : parsed
    updateQuantity(id, next)
  }

  function handleCheckout() {
    if (status !== 'authenticated') {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/cart'))
      return
    }
    if (!canCheckout) {
      notify('Cart not ready', productsError ?? 'Please try again.', 'destructive')
      return
    }
    setCheckoutStep('payment')
  }

  function handlePaymentSubmit() {
    if (!selectedPayment) {
      notify('Select a payment method', 'Choose one option to continue.', 'destructive')
      return
    }
    setCheckoutStep('payment-details')
  }

  useEffect(() => {
    if (checkoutStep !== 'confirmation') return
    if (selectedPayment !== 'mpesa') return
    if (!orderDetails?.order_id) return
    if (!session?.accessToken) return

    if (orderDetails.status === 'paid' || orderDetails.status === 'failed') return

    let alive = true
    const orderId = orderDetails.order_id

    const timer = setInterval(async () => {
      try {
        const latest = await fetchOrderStatus(orderId, session.accessToken as string)
        if (!alive) return

        setOrderDetails((prev) => ({ ...(prev || { order_id: orderId }), ...latest }))

        if (latest.status === 'paid') {
          notify('Payment confirmed', 'M-Pesa payment received. Thank you!')
          clearCart()
          clearInterval(timer)
        } else if (latest.status === 'failed') {
          notify('Payment failed', 'Payment was not completed. You can try again.', 'destructive')
          clearInterval(timer)
        }
      } catch {
        // ignore
      }
    }, 3000)

    return () => {
      alive = false
      clearInterval(timer)
    }
  }, [checkoutStep, selectedPayment, orderDetails?.order_id, orderDetails?.status, session?.accessToken, clearCart])

  async function handlePaymentDetailsSubmit() {
    if (!session?.accessToken) {
      router.push('/auth/signin?callbackUrl=' + encodeURIComponent('/cart'))
      return
    }

    if (items.length === 0) {
      setCheckoutStep('cart')
      return
    }

    if (selectedPayment === 'card') {
      const num = paymentDetails.cardNumber.replace(/\s/g, '')
      if (num.length < 12 || !paymentDetails.expiry || paymentDetails.cvv.length < 3) {
        notify('Incomplete card details', 'Please fill in all card fields.', 'destructive')
        return
      }
    }

    let mpesaDigits = ''
    if (selectedPayment === 'mpesa') {
      let digits = normalizePhone(paymentDetails.phone)
      if (!digits || digits.length < 9) {
        notify('Invalid phone number', 'Enter a valid M-Pesa phone number.', 'destructive')
        return
      }
      if (digits.startsWith('0')) digits = '254' + digits.slice(1)
      mpesaDigits = digits
    }

    setCheckoutLoading(true)
    try {
      const orderItems = items.map((i) => ({
        merchandise_id: i.id,
        quantity: i.quantity,
      }))

      const created: OrderDetails = await createOrder(orderItems, session.accessToken as string)
      setOrderDetails(created)

      if (selectedPayment === 'mpesa') {
        const res = await fetch(`${BASE}/mpesa/pay`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({
            phone: mpesaDigits,
            order_id: created.order_id,
          }),
        })

        const data = await res.json().catch(() => ({} as any))

        if (!res.ok || data?.error) {
          notify('STK push failed', data?.error || 'Failed to initiate STK push.', 'destructive')
          return
        }

        setOrderDetails((prev) => ({
          ...(prev || created),
          checkout_request_id: data.checkout_request_id ?? prev?.checkout_request_id ?? null,
          merchant_request_id: data.merchant_request_id ?? prev?.merchant_request_id ?? null,
        }))

        notify('STK push sent', 'Approve the payment on your phone. We will confirm automatically.')
        setCheckoutStep('confirmation')
        return
      }

      clearCart()
      setCheckoutStep('confirmation')
      notify('Order placed', 'Your order was created successfully.')
    } catch (err: any) {
      notify('Checkout failed', err?.message ?? 'Failed to create order', 'destructive')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const pageTitle =
    checkoutStep === 'cart'
      ? 'Your Cart'
      : checkoutStep === 'payment'
      ? 'Select Payment Method'
      : checkoutStep === 'payment-details'
      ? 'Enter Payment Details'
      : 'Order Status'

  const pageSubtitle =
    checkoutStep === 'cart'
      ? 'Review items in your cart before checkout.'
      : checkoutStep === 'payment'
      ? 'Choose how you want to pay for your order.'
      : checkoutStep === 'payment-details'
      ? 'Complete payment details to place your order.'
      : selectedPayment === 'mpesa' && orderDetails?.status !== 'paid'
      ? 'Waiting for M-Pesa confirmation. Approve the prompt on your phone.'
      : 'Your order has been placed successfully.'

  return (
    <div className="min-h-screen">
      <Navbar />

      {status === 'loading' ? (
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <main>
          <section className="bg-gradient-to-b from-primary/5 to-background py-12 border-b">
            <div className="max-w-7xl mx-auto px-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{pageTitle}</h1>
                  <p className="text-lg text-foreground/60">{pageSubtitle}</p>
                </div>
                <Stepper step={checkoutStep} />
              </div>
            </div>
          </section>

          <section className="py-12">
            <div className="max-w-7xl mx-auto px-4">
              {checkoutStep === 'cart' && (
                <>
                  {items.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="grid gap-8 lg:grid-cols-3">
                      <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold">Items</h2>
                          <Button
                            variant="ghost"
                            className="text-muted-foreground"
                            onClick={() => {
                              clearCart()
                              notify('Cart cleared')
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Clear cart
                          </Button>
                        </div>

                        {items.map((item) => {
                          const stock = item.product.stock
                          const atMax = typeof stock === 'number' && stock >= 0 && item.quantity >= stock

                          return (
                            <Card key={item.id} className="p-4">
                              <div className="flex gap-4">
                                <div className="h-20 w-20 shrink-0 overflow-hidden rounded border border-border bg-muted">
                                  <img
                                    src={item.product.image_url || ''}
                                    alt={item.product.name}
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                                    }}
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                      <div className="font-semibold text-foreground truncate">{item.product.name}</div>
                                      <div className="mt-1 text-sm text-muted-foreground">
                                        {moneyKES(Number(item.product.price) || 0)}
                                      </div>
                                      {typeof stock === 'number' && stock >= 0 && (
                                        <div className="mt-2 text-xs text-muted-foreground">
                                          {stock === 0 ? 'Out of stock' : `${stock} in stock`}
                                        </div>
                                      )}
                                    </div>

                                    <div className="text-right">
                                      <div className="text-sm text-muted-foreground">Line total</div>
                                      <div className="font-semibold">
                                        {moneyKES((Number(item.product.price) || 0) * item.quantity)}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="inline-flex items-center gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onQtyMinus(item.id, item.quantity)}
                                        disabled={item.quantity <= 1}
                                      >
                                        -
                                      </Button>

                                      <Input
                                        className="w-16 text-center"
                                        inputMode="numeric"
                                        value={item.quantity}
                                        onChange={(e) => onQtyInput(item.id, e.target.value, stock)}
                                      />

                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onQtyPlus(item.id, item.quantity, stock)}
                                        disabled={typeof stock === 'number' ? stock <= 0 || atMax : false}
                                      >
                                        +
                                      </Button>
                                    </div>

                                    <Button
                                      type="button"
                                      variant="ghost"
                                      className="text-muted-foreground hover:text-foreground"
                                      onClick={() => {
                                        removeFromCart(item.id)
                                        notify('Removed', `${item.product.name} removed from cart.`)
                                      }}
                                    >
                                      Remove
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </Card>
                          )
                        })}
                      </div>

                      <Card className="p-5 h-fit">
                        <h3 className="text-lg font-semibold">Order summary</h3>

                        <div className="mt-5 space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-medium">{moneyKES(subtotal)}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Shipping</span>
                            <span className="font-medium">{moneyKES(shipping)}</span>
                          </div>
                          <div className="h-px bg-border" />
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Total</span>
                            <span className="text-lg font-bold">{moneyKES(total)}</span>
                          </div>
                        </div>

                        <div className="mt-5 space-y-3">
                          <Button className="w-full" onClick={handleCheckout} disabled={!canCheckout}>
                            Proceed to Checkout
                          </Button>
                        </div>

                        <div className="mt-5 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2 text-foreground/80">
                            <ShieldCheck className="h-4 w-4" />
                            Secure checkout
                          </div>
                          <p className="mt-1">Payments are processed securely. Never share your PIN or OTP.</p>
                        </div>
                      </Card>
                    </div>
                  )}
                </>
              )}

              {checkoutStep === 'payment' && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold">Choose payment method</h3>

                      <RadioGroup
                        value={selectedPayment}
                        onValueChange={(v) => setSelectedPayment(v as PaymentMethod)}
                        className="mt-6 space-y-4"
                      >
                        <label className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted/40 cursor-pointer">
                          <RadioGroupItem value="mpesa" id="mpesa" />
                          <Smartphone className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <div className="font-medium">M-Pesa</div>
                            <div className="text-sm text-muted-foreground">Pay with your mobile money.</div>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted/40 cursor-pointer">
                          <RadioGroupItem value="card" id="card" />
                          <CreditCard className="h-5 w-5 text-primary" />
                          <div className="flex-1">
                            <div className="font-medium">Card</div>
                            <div className="text-sm text-muted-foreground">Visa, Mastercard, etc.</div>
                          </div>
                        </label>

                        <label className="flex items-center gap-3 rounded-lg border border-border p-4 hover:bg-muted/40 cursor-pointer">
                          <RadioGroupItem value="cash" id="cash" />
                          <div className="h-5 w-5 rounded bg-primary/10" />
                          <div className="flex-1">
                            <div className="font-medium">Cash on delivery</div>
                            <div className="text-sm text-muted-foreground">Pay when you receive your order.</div>
                          </div>
                        </label>
                      </RadioGroup>

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <Button variant="outline" onClick={() => setCheckoutStep('cart')} className="gap-2">
                          <ArrowLeft className="h-4 w-4" />
                          Back to cart
                        </Button>
                        <Button onClick={handlePaymentSubmit} disabled={!selectedPayment}>
                          Continue
                        </Button>
                      </div>
                    </Card>
                  </div>

                  <Card className="p-5 h-fit">
                    <h3 className="text-lg font-semibold">Order summary</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{moneyKES(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-medium">{moneyKES(shipping)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total</span>
                        <span className="text-lg font-bold">{moneyKES(total)}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {checkoutStep === 'payment-details' && (
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Card className="p-6">
                      <h3 className="text-lg font-semibold">Payment details</h3>

                      <div className="mt-6 space-y-4">
                        {selectedPayment === 'mpesa' && (
                          <div className="space-y-2">
                            <Label htmlFor="phone">M-Pesa phone number</Label>
                            <Input
                              id="phone"
                              placeholder="0712345678"
                              inputMode="tel"
                              value={paymentDetails.phone}
                              onChange={(e) => setPaymentDetails({ ...paymentDetails, phone: e.target.value })}
                            />
                          </div>
                        )}

                        {selectedPayment === 'card' && (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor="cardNumber">Card number</Label>
                              <Input
                                id="cardNumber"
                                placeholder="1234 5678 9012 3456"
                                inputMode="numeric"
                                value={paymentDetails.cardNumber}
                                onChange={(e) => setPaymentDetails({ ...paymentDetails, cardNumber: e.target.value })}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="expiry">Expiry</Label>
                                <Input
                                  id="expiry"
                                  placeholder="MM/YY"
                                  inputMode="numeric"
                                  value={paymentDetails.expiry}
                                  onChange={(e) => setPaymentDetails({ ...paymentDetails, expiry: e.target.value })}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="cvv">CVV</Label>
                                <Input
                                  id="cvv"
                                  placeholder="123"
                                  inputMode="numeric"
                                  value={paymentDetails.cvv}
                                  onChange={(e) => setPaymentDetails({ ...paymentDetails, cvv: e.target.value })}
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {selectedPayment === 'cash' && (
                          <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                            You will pay in cash when your order is delivered.
                          </div>
                        )}
                      </div>

                      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
                        <Button variant="outline" onClick={() => setCheckoutStep('payment')} className="gap-2">
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>

                        <Button onClick={handlePaymentDetailsSubmit} disabled={checkoutLoading}>
                          {checkoutLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Place order
                        </Button>
                      </div>
                    </Card>
                  </div>

                  <Card className="p-5 h-fit">
                    <h3 className="text-lg font-semibold">Order summary</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">{moneyKES(subtotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-medium">{moneyKES(shipping)}</span>
                      </div>
                      <div className="h-px bg-border" />
                      <div className="flex items-center justify-between">
                        <span className="font-medium">Total</span>
                        <span className="text-lg font-bold">{moneyKES(total)}</span>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {checkoutStep === 'confirmation' && (
                <Card className="max-w-xl mx-auto p-8 text-center">
                  <CheckCircle
                    className={cn(
                      'h-16 w-16 mx-auto mb-4',
                      selectedPayment === 'mpesa' && orderDetails?.status !== 'paid' ? 'text-primary' : 'text-green-600'
                    )}
                  />
                  <h3 className="text-2xl font-bold mb-2">
                    {selectedPayment === 'mpesa' && orderDetails?.status !== 'paid' ? 'Waiting for payment' : 'Order confirmed'}
                  </h3>

                  <p className="text-muted-foreground">
                    {orderDetails?.order_id ? (
                      <>
                        Order ID: <span className="font-medium">#{orderDetails.order_id}</span>
                        {selectedPayment === 'mpesa' && orderDetails?.status ? (
                          <>
                            <span className="mx-2">•</span>
                            Status: <span className="font-medium">{orderDetails.status}</span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      'Your order has been placed successfully.'
                    )}
                  </p>

                  {selectedPayment === 'mpesa' && orderDetails?.status !== 'paid' && (
                    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground text-left">
                      <div className="font-medium text-foreground">Next step</div>
                      <p className="mt-1">
                        Approve the M-Pesa prompt on your phone. This page will update automatically once payment is confirmed.
                      </p>

                      {orderDetails?.checkout_request_id ? (
                        <p className="mt-2">
                          CheckoutRequestID: <span className="font-mono">{orderDetails.checkout_request_id}</span>
                        </p>
                      ) : null}

                      {orderDetails?.merchant_request_id ? (
                        <p className="mt-2">
                          MerchantRequestID: <span className="font-mono">{orderDetails.merchant_request_id}</span>
                        </p>
                      ) : null}

                      {orderDetails?.mpesa_receipt ? (
                        <p className="mt-2">
                          Receipt: <span className="font-mono">{orderDetails.mpesa_receipt}</span>
                        </p>
                      ) : null}
                    </div>
                  )}

                  <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button onClick={() => router.push('/shop')}>Continue shopping</Button>
                    <Button variant="outline" onClick={() => router.push('/projects')}>
                      Explore projects
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </section>
        </main>
      )}

      <Footer />
    </div>
  )
}
