# College ERP - Fees & Billing Module PRD

## Original Problem Statement
Build a production-ready Fees & Billing module for a College ERP system using FastAPI (Python backend), PostgreSQL (database), and React (frontend). Integrates with an Admission module. Bill-based system where each installment = 1 bill.

## Architecture
- **Backend:** FastAPI (Python) with asyncpg for PostgreSQL
- **Frontend:** React with Tailwind CSS, Shadcn UI, Recharts
- **Database:** PostgreSQL (tables: admin_users, bills, payments, receipts, refunds)
- **Payment Gateway:** Razorpay (test mode)
- **Auth:** JWT-based admin authentication

## User Personas
1. **Admin** - Views dashboard, manages bills, processes refunds, views payments & receipts
2. **Student/Applicant** - Views bills, makes payments via Razorpay, views receipts

## Core Requirements
- Bills as core entity (installment-based)
- Two stages: Applicant (brochure fees) → Student (course fee installments)
- Razorpay payment integration
- Receipt generation on payment
- Refund tracking system
- Admin dashboard with academic year filter, charts, metrics

## What's Been Implemented (April 4, 2026)
### Backend
- PostgreSQL schema with 5 tables (admin_users, bills, payments, receipts, refunds)
- JWT admin auth (login/logout/me)
- Bill generation API (splits fees into installments)
- Brochure payment API
- Razorpay payment order creation + verification
- Receipt auto-generation on payment
- Refund CRUD with approval/rejection
- Dashboard stats API with academic year filter
- Program-wise and monthly collection analytics
- Sample data seeding (5 students, multiple bills, payments, receipts, refund)

### Frontend
- Admin login page
- Admin dashboard with: metric cards, pie chart (paid vs unpaid), bar chart (program-wise), monthly collection chart, program summary table, quick action buttons
- Bill Management page with filters and bill generation dialog
- Payment History page
- Refund Management page with create/approve/reject
- Receipt List page
- Student Fee Portal with: user ID lookup, pending bills with Pay Now (Razorpay), paid bills, receipts

## Testing Status
- Backend: 100% (14/14 tests passed)
- Frontend: 95% (all flows working)

## Prioritized Backlog
### P0
- (Completed) All core features

### P1
- PDF receipt download/export
- Bulk bill generation for entire batch
- Email notifications on payment/receipt
- Search by student name (requires student info)

### P2
- Payment reminders/due dates
- Partial payment support
- Academic year creation/management
- Export reports to Excel/CSV
- Print-friendly receipt view
- Mobile responsive optimizations

## Next Tasks
- Add PDF receipt generation
- Add bulk operations for bill management
- Add student search by name
- Enhanced refund workflow with email notifications
