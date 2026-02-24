#  Innovation Marketplace

A full-stack web platform that connects student innovators with recruiters through a structured, role-based project marketplace.

---

## Project Description

- Students submit and manage capstone projects  
- Admins review and approve submissions  
- Recruiters browse approved projects and evaluate talent  
- Users can purchase official merchandise  
- Payments are integrated via M-Pesa (Safaricom Sandbox)  
- Structured review workflow with secure role-based access control  

---

## Live Deployment

- **Frontend:**  https://frontend-teal-seven-91.vercel.app/
 
- **Backend API:** https://innovation-marketplace.onrender.com/ 

---

## System Architecture

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, ShadCN UI  
- **Backend:** Flask REST API  
- **Database:** PostgreSQL / SQLite  
- **Authentication:** NextAuth + JWT  
- **Payments:** M-Pesa Daraja API (Sandbox)  

The frontend communicates with the backend API to:

- Handle authentication  
- Manage projects  
- Enforce role-based authorization  
- Process payments  
- Create and manage orders  

---

## User Roles

### Student

- Submit projects  
- Upload thumbnails  
- Add technologies and categories  
- Edit their own submissions  

###  Admin

- Review submitted projects  
- Approve or reject submissions  
- Manage users  
- Manage merchandise  

###  Recruiter

- Access recruiter dashboard  
- View approved projects only  
- Filter by technology  
- Search by student or team  
- Evaluate project stack  

---

## Core Features

### Authentication & Authorization

- Role-based access control  
- Secure login via NextAuth  
- Protected recruiter dashboard  
- Server-side session validation  

### Project Management

- Create, edit, delete projects  
- Upload thumbnail images  
- Category and technology tagging  
- Admin approval workflow  
- Public page displays approved projects only  

### Advanced Filtering & Sorting

- Search by:
  - Title  
  - Description  
  - Author  
- Filter by category  
- Sort by:
  - Newest  
  - Most viewed  
  - Highest rated  

###  Recruiter Dashboard

- Displays approved submissions only  
- Shows:
  - Total approved projects  
  - Unique students  
  - Technologies count  
- Live filtering and refresh functionality  

### Merchandise Shop

- Browse items  
- Add to cart  
- Checkout flow  
- Order tracking  

### M-Pesa Integration

- STK Push (Sandbox)  
- Secure credential handling via `.env`  
- Token generation and payment request handling  
- Order creation after successful payment  

---

##  Project Structure

```
innovation_marketplace/
│
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│
├── server/
│   ├── models.py
│   ├── resources/
│   ├── migrations/
│
└── README.md
```

---

##  Installation & Setup

### 1. Clone Repository

```bash
git clone https://github.com/your-repo/innovation_marketplace.git
cd innovation_marketplace
```

---

### 2. Backend Setup

```bash
cd server
pipenv install
pipenv shell
flask db upgrade
flask run
```

Create a `.env` file inside `/server`:

```
MPESA_CONSUMER_KEY=
MPESA_CONSUMER_SECRET=
MPESA_SHORTCODE=
MPESA_PASSKEY=
JWT_SECRET_KEY=
DATABASE_URL=
```

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Create a `.env.local` file inside `/frontend`:

```
NEXT_PUBLIC_API_URL=
NEXTAUTH_SECRET=
```

---

##  Approval Workflow

1. Student submits project  
2. Admin reviews project  
3. Admin approves project  
4. Approved project becomes visible on:
   - Public `/projects` page  
   - Recruiter dashboard  
5. Unapproved projects remain hidden  

---

##  Security Considerations

- Role-based route protection  
- Server-side session validation  
- Protected admin endpoints  
- Environment variables for sensitive credentials  
- Secure payment credential handling  

---

##  Learning Outcomes

- Full-stack architecture  
- RESTful API design  
- Authentication and authorization  
- Payment gateway integration  
- Database modeling with SQLAlchemy  
- State management in React  
- Secure environment handling  

---

##  Contributors

- **Joshua Imbusi** — Frontend & Integration  
- **Ruth Jelagat** — Frontend & Integration
- **Castro Kimaru** — Frontend & Integration
- **Grace Odongo** - Backend 
- **Mark Wagacha** — Backend 


---

##  License

Developed for academic purposes.
