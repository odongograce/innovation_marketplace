import { Suspense } from 'react'
import CartClient from './cart-client'

export default function CartPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading cart…</div>}>
      <CartClient />
    </Suspense>
  )
}
