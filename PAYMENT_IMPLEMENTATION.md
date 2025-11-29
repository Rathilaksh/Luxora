# Payment Integration Implementation

## Overview
This document details the Stripe payment integration for Luxora's booking system.

## Features Implemented

### Backend (`server.js`)
1. **Stripe Initialization**
   - Stripe SDK initialized with secret key
   - Environment variables for configuration
   - Webhook secret for event verification

2. **Payment Endpoints**
   - `POST /api/payments/create-checkout-session` - Creates Stripe Checkout session
   - `GET /api/payments/verify/:sessionId` - Verifies payment and creates booking
   - `POST /api/payments/webhook` - Handles Stripe webhook events

3. **Database Schema (`prisma/schema.prisma`)**
   - Added `paymentStatus` field (UNPAID, PAID, REFUNDED)
   - Added `stripeSessionId` for session tracking
   - Added `stripePaymentId` for payment intent reference
   - Index on `stripeSessionId` for quick lookups

### Frontend

1. **BookingForm Component** (`client/src/components/BookingForm.jsx`)
   - Date selection with DatePicker
   - Guest count selector
   - Real-time price calculation with extra guest fees
   - Stripe Checkout integration
   - Validates availability before payment

2. **PaymentSuccess Component** (`client/src/components/PaymentSuccess.jsx`)
   - Verifies payment after redirect
   - Displays booking confirmation
   - Shows booking details (dates, guests, price)
   - Loading and error states

3. **App Integration** (`client/src/App.jsx`)
   - URL parameter handling for payment success/cancel
   - Modal state management
   - "Book Now" button in listing details
   - Automatic data refresh after successful payment

4. **Styling** (`client/src/styles.css`)
   - Booking form modal with overlay
   - Payment status modal (success/error states)
   - Guest controls with increment/decrement buttons
   - Responsive design for mobile devices

## Setup Instructions

### 1. Get Stripe API Keys
1. Sign up at [https://stripe.com](https://stripe.com)
2. Go to [Dashboard → API Keys](https://dashboard.stripe.com/apikeys)
3. Copy your **Publishable key** (starts with `pk_test_`)
4. Copy your **Secret key** (starts with `sk_test_`)

### 2. Configure Environment Variables

Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

Edit `.env` and add your Stripe keys:
```env
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE
CLIENT_URL=http://localhost:3000
```

### 3. Update Client Publishable Key

Edit `client/src/components/BookingForm.jsx`:
```javascript
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY_HERE');
```

### 4. Run Database Migration
```bash
npx prisma migrate deploy
```

### 5. Restart Server
```bash
node server.js
```

## Payment Flow

### 1. User Initiates Booking
- User clicks "Book Now" on listing
- BookingForm modal opens
- User selects dates and guest count
- Price calculated in real-time

### 2. Payment Creation
- User clicks "Proceed to Payment"
- Frontend calls `/api/payments/create-checkout-session`
- Backend validates:
  - User authentication
  - Listing availability
  - Date validity
- Creates Stripe Checkout Session with metadata:
  - `userId`, `listingId`, `startDate`, `endDate`, `guests`, `totalPrice`
- Returns `sessionId` and redirect `url`

### 3. Stripe Checkout
- User redirected to Stripe Checkout page
- Enters payment details (test card: `4242 4242 4242 4242`)
- Stripe processes payment
- Redirects to success/cancel URL

### 4. Payment Verification
- User redirected back to app with `?payment=success&session_id=XXX`
- PaymentSuccess component auto-loads
- Calls `/api/payments/verify/:sessionId`
- Backend:
  - Retrieves session from Stripe
  - Verifies payment status
  - Creates booking with `CONFIRMED` status and `PAID` payment status
  - Returns booking details
- Frontend displays confirmation

### 5. Webhook Handling (Optional but Recommended)
- Stripe sends webhook events to `/api/payments/webhook`
- Events handled:
  - `checkout.session.completed` - Creates booking if not already created
  - `payment_intent.payment_failed` - Logs failed payment
- Ensures booking creation even if user closes browser

## Testing

### Test Cards
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`
- Use any future expiry date, any CVC

### Test Flow
1. Login to the application
2. Click on a listing to view details
3. Click "Book Now"
4. Select check-in/check-out dates
5. Adjust guest count
6. Click "Proceed to Payment"
7. On Stripe Checkout:
   - Email: any email
   - Card: `4242 4242 4242 4242`
   - Expiry: any future date
   - CVC: any 3 digits
8. Click "Pay"
9. Should redirect back with success message
10. Booking confirmation displayed

## Price Calculation

### Base Price
```
nightlyRate × numberOfNights
```

### Extra Guest Fee
```
(guests - baseGuests) × extraGuestFee × numberOfNights
```

### Total
```
basePrice + extraGuestFee
```

### Example
- Listing: $200/night, 2 base guests, $50 extra guest fee
- Booking: 3 nights, 4 guests
- Calculation:
  - Base: $200 × 3 = $600
  - Extra: (4 - 2) × $50 × 3 = $300
  - **Total: $900**

## Webhook Setup (Production)

### 1. Install Stripe CLI
```bash
brew install stripe/stripe-cli/stripe
```

### 2. Login
```bash
stripe login
```

### 3. Forward Events (Development)
```bash
stripe listen --forward-to http://localhost:3000/api/payments/webhook
```

Copy the webhook signing secret and add to `.env`:
```env
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### 4. Production Webhooks
1. Go to [Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. URL: `https://yourdomain.com/api/payments/webhook`
4. Events: Select `checkout.session.completed` and `payment_intent.payment_failed`
5. Copy signing secret to production `.env`

## Security Considerations

1. **Environment Variables**: Never commit `.env` to Git
2. **Token Validation**: All payment endpoints require JWT authentication
3. **Amount Verification**: Server calculates price independently (never trust client)
4. **Idempotency**: Check for existing bookings by `stripeSessionId`
5. **Webhook Verification**: Verify webhook signatures using `STRIPE_WEBHOOK_SECRET`

## Error Handling

### Frontend
- Missing dates → Alert to select dates
- Guest limit exceeded → Disable increment button
- Payment API errors → Display error message
- Payment verification fails → Show error modal

### Backend
- Missing fields → 400 Bad Request
- Listing not found → 404 Not Found
- Dates conflict → 409 Conflict
- Stripe errors → 500 Internal Server Error with logged details

## Migration Applied

```sql
-- 20251129125402_add_payment_fields
ALTER TABLE Booking ADD COLUMN paymentStatus TEXT DEFAULT 'UNPAID';
ALTER TABLE Booking ADD COLUMN stripeSessionId TEXT;
ALTER TABLE Booking ADD COLUMN stripePaymentId TEXT;
CREATE INDEX Booking_stripeSessionId_idx ON Booking(stripeSessionId);
```

## API Reference

### POST /api/payments/create-checkout-session
**Auth**: Required (Bearer token)

**Request Body**:
```json
{
  "listingId": 1,
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-01-18T00:00:00Z",
  "guests": 4
}
```

**Response**:
```json
{
  "sessionId": "cs_test_xxxxx",
  "url": "https://checkout.stripe.com/xxxxx"
}
```

### GET /api/payments/verify/:sessionId
**Auth**: Required (Bearer token)

**Response**:
```json
{
  "booking": {
    "id": 123,
    "listingId": 1,
    "userId": 5,
    "startDate": "2024-01-15T00:00:00Z",
    "endDate": "2024-01-18T00:00:00Z",
    "guests": 4,
    "totalPrice": 900,
    "status": "CONFIRMED",
    "paymentStatus": "PAID",
    "stripeSessionId": "cs_test_xxxxx",
    "listing": { ... },
    "user": { ... }
  }
}
```

## Next Steps

1. **Email Notifications**: Send confirmation emails after booking
2. **Booking Management**: Allow users to view/cancel bookings
3. **Refunds**: Implement cancellation with refund logic
4. **Calendar Blocking**: Show unavailable dates in UI
5. **Multi-currency**: Support multiple currencies
6. **Payment Methods**: Add Apple Pay, Google Pay support

## Troubleshooting

### Payment not creating booking
- Check browser console for errors
- Verify Stripe keys are correct (test mode vs live mode)
- Check server logs for Stripe API errors
- Ensure database migration applied successfully

### Redirect not working
- Verify `CLIENT_URL` in `.env` matches your actual URL
- Check for CORS issues in browser console
- Ensure success/cancel URLs are correct in Stripe Dashboard

### Webhook not triggering
- Verify webhook secret is correct
- Check endpoint URL is publicly accessible (production)
- Use Stripe CLI for local testing
- Review webhook delivery attempts in Stripe Dashboard
