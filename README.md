# innovation_marketplace

Moringa School Innovation Marketplace

 1. Overview

The Moringa School Innovation Marketplace is an online platform built to turn student capstone projects into sustainable, market-ready innovations.

Each year, Moringa students create impressive and impactful software solutions. Unfortunately, many of these projects are only presented during demo day and then left unused. This platform addresses that gap by offering a centralized digital marketplace where:

-Students can showcase and manage their projects
-Recruiters and investors can discover emerging talent
-Projects can generate revenue
-Moringa School can sell branded merchandise

The platform functions as a digital portfolio platform, talent discovery space, and e-commerce store, helping students earn income, gain exposure, and strengthen their professional credibility before entering the job market.

2. Problem Statement

Many capstone projects developed by Moringa students:
-Do not receive continued visibility
-Miss opportunities for monetization
-Are difficult for recruiters to find

As a result, valuable innovations and career prospects are often lost.

The Innovation Marketplace addresses this challenge by building a lasting ecosystem that supports and promotes student innovation.

  Key Features
 Student Capabilities
-Secure student registration and login (JWT authentication)
-Profile creation and management
-Project uploads including:
   ~Project title
   ~Detailed description
   ~Technology stack
   ~GitHub repository link
   ~Live demo or video
   ~Team member details
   ~Category tags (e.g., HealthTech, EdTech, FinTech)

-Project performance analytics (optional)
-Option to list projects as “For Sale”

  Project Discovery & Listings
 -Search functionality by:
a.Category
b.Technology stack
c.Student name

 -Advanced filtering options
-Highlighted or featured projects section (optional)

3. Project Detail View
-Comprehensive project description
-Screenshots or demo video
-GitHub repository link
-Live deployment link
-“Hire this Team” feature
-Purchase option (if enabled)

4. Merchandise E-Commerce Section
-Product listings (hoodies, mugs, stickers, etc.)
-Shopping cart functionality
-Checkout process
-Integrated payment solutions (M-Pesa / Stripe)
-Admin inventory control

5. Admin Dashboard

-Review and approve/reject submitted projects
-Manage merchandise stock
-Track engagement metrics
-Oversee overall platform activity

6. Recruiter & Client Engagement

-Hire/contact forms for recruiters
-Reviews and endorsements (optional)
-Booking or scheduling system (optional)

7. Technology Stack
Frontend
  -React.js or Next.js
  -Tailwind CSS or CSS Modules

Backend
  -Flask RESTful API
  -JWT-based authentication

Database
  -PostgreSQL

File Storage
  -Cloudinary or AWS S3 (for media storage)

Payment Integration
-M-Pesa Daraja API or Stripe API

Deployment
  -Frontend: Vercel or Netlify
  -Backend: Render, Railway, or Heroku
  -Database: Cloud-hosted PostgreSQL

8. Security & Authentication
   -JWT-based authentication
   -Role-based access control (Student and Admin roles)
   -Secure login with protected routes