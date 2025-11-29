# Email Notifications Implementation

## Overview
Luxora now includes a comprehensive email notification system powered by Nodemailer. Users receive professional HTML emails for bookings, registrations, and host notifications.

## Features

### Email Types

1. **Welcome Email** (User Registration)
   - Sent when a new user registers
   - Introduces Luxora features
   - Encourages profile completion
   - Links to start exploring

2. **Booking Confirmation** (Guest)
   - Sent after successful payment
   - Includes all booking details
   - Shows pricing breakdown
   - Provides booking ID for reference
   - Lists next steps

3. **Host Booking Notification** (Host)
   - Notifies hosts of new bookings
   - Shows guest information
   - Displays earnings
   - Reminds hosts of preparation steps

## Setup Instructions

### 1. Email Provider Options

#### Option A: Gmail (Quick Setup)
1. Enable 2-Factor Authentication on your Gmail account
2. Generate App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Copy the 16-character password
3. Add to `.env`:
   ```env
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-16-char-app-password
   EMAIL_FROM=noreply@luxora.com
   ```

#### Option B: Ethereal (Testing)
1. Visit https://ethereal.email
2. Click "Create Ethereal Account"
3. Copy credentials to `.env`:
   ```env
   EMAIL_HOST=smtp.ethereal.email
   EMAIL_PORT=587
   EMAIL_USER=generated-username
   EMAIL_PASS=generated-password
   EMAIL_FROM=noreply@luxora.com
   ```
4. View sent emails at https://ethereal.email/messages

#### Option C: SendGrid (Production)
1. Sign up at https://sendgrid.com
2. Create API Key
3. Add to `.env`:
   ```env
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASS=your-api-key
   EMAIL_FROM=verified-sender@yourdomain.com
   ```

#### Option D: Mailtrap (Development)
1. Sign up at https://mailtrap.io
2. Get SMTP credentials from inbox settings
3. Add to `.env`:
   ```env
   EMAIL_HOST=smtp.mailtrap.io
   EMAIL_PORT=2525
   EMAIL_USER=your-mailtrap-username
   EMAIL_PASS=your-mailtrap-password
   EMAIL_FROM=noreply@luxora.com
   ```

### 2. Environment Configuration

Create or update `.env` file in the project root:

```env
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM=Luxora <noreply@luxora.com>
CLIENT_URL=http://localhost:3000
```

### 3. Restart Server

```bash
node server.js
```

## Email Service Architecture

### Module Structure (`services/emailService.js`)

```javascript
const nodemailer = require('nodemailer');

// Functions:
- getTransporter()           // Creates SMTP connection
- isEmailConfigured()        // Checks if email is set up
- sendWelcomeEmail(user)     // New user registration
- sendBookingConfirmation(booking)  // Guest confirmation
- sendHostBookingNotification(booking) // Host notification
```

### Integration Points

1. **Registration** (`POST /api/register`)
   - Sends welcome email after user creation
   - Non-blocking (doesn't delay response)

2. **Payment Verification** (`GET /api/payments/verify/:sessionId`)
   - Sends booking confirmation to guest
   - Sends booking notification to host
   - Both emails sent after booking creation

3. **Webhook** (`POST /api/payments/webhook`)
   - Sends same emails if booking created via webhook
   - Ensures emails sent even if user closes browser

## Email Templates

### Design Features
- Responsive HTML design
- Gradient header with Luxora branding
- Clean card-based layout
- Mobile-friendly
- Professional typography
- Actionable buttons
- Plain text fallback

### Template Variables

#### Welcome Email
- `user.name` - User's display name
- `CLIENT_URL` - Link to homepage

#### Booking Confirmation
- `user.name` - Guest name
- `listing.title` - Property name
- `listing.city`, `listing.country` - Location
- `startDate`, `endDate` - Formatted dates
- `nights` - Duration
- `guests` - Guest count
- `totalPrice` - Total paid
- `booking.id` - Booking reference

#### Host Notification
- `listing.host.name` - Host name
- `user.name` - Guest name
- All booking details from above

## Testing

### 1. Test Welcome Email

Register a new user:
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

### 2. Test Booking Emails

Complete a booking with Stripe payment:
1. Login to the app
2. Click "Book Now" on a listing
3. Complete Stripe Checkout (use test card `4242 4242 4242 4242`)
4. Check email inbox for confirmation

### 3. Check Server Logs

Monitor email sending:
```bash
# Watch for success messages
tail -f logs/server.log | grep -i email

# Or in console:
# "Welcome email sent to test@example.com"
# "Booking confirmation email sent to guest@example.com"
# "Host notification email sent to host@example.com"
```

### 4. Ethereal Email Testing

If using Ethereal:
1. Complete any action that sends email
2. Visit https://ethereal.email/messages
3. Login with your Ethereal credentials
4. View and preview sent emails

## Error Handling

### Non-Blocking Sends
Emails are sent asynchronously and don't block API responses:
```javascript
emailService.sendWelcomeEmail(user).catch(err =>
  console.error('Failed to send welcome email:', err)
);
```

### Graceful Degradation
If email is not configured:
- Application continues to work normally
- Console logs: "Email not configured, skipping..."
- No errors thrown

### Common Issues

1. **"Email not configured"**
   - Check `.env` file exists
   - Verify `EMAIL_USER` and `EMAIL_PASS` are set
   - Restart server after changing `.env`

2. **"Authentication failed"**
   - Gmail: Use App Password, not regular password
   - Verify credentials are correct
   - Check 2FA is enabled for Gmail

3. **"Connection timeout"**
   - Check `EMAIL_HOST` is correct
   - Verify `EMAIL_PORT` (587 for TLS, 465 for SSL)
   - Ensure firewall allows SMTP

4. **"Emails not received"**
   - Check spam/junk folder
   - Verify recipient email is correct
   - Check server logs for send confirmation
   - For Ethereal, check web interface

## Production Considerations

### 1. Use Transactional Email Service
For production, use professional services:
- **SendGrid**: 100 free emails/day, reliable delivery
- **Mailgun**: 5,000 free emails/month
- **Amazon SES**: Pay as you go, very low cost
- **Postmark**: Excellent deliverability

### 2. Domain Verification
- Use verified sender domain
- Set up SPF, DKIM, DMARC records
- Improves deliverability

### 3. Rate Limiting
- Implement email rate limits
- Prevent spam/abuse
- Monitor sending volume

### 4. Email Queue
For high volume, use queue:
```bash
npm install bull redis
```

### 5. Template Management
- Move templates to separate files
- Use template engine (Handlebars, EJS)
- Support multiple languages

### 6. Tracking
- Add open tracking pixels
- Link click tracking
- Bounce handling
- Unsubscribe links

## Customization

### Change Email Styles

Edit `services/emailService.js` and modify CSS in template strings:

```javascript
const html = `
  <style>
    .header { background: #your-color; }
    .button { background: #your-accent; }
  </style>
`;
```

### Add New Email Types

1. Create function in `emailService.js`:
```javascript
async function sendPasswordReset(user, resetToken) {
  // Build email template
  const html = `...`;
  
  const mailOptions = {
    from: `"Luxora" <${EMAIL_FROM}>`,
    to: user.email,
    subject: 'Reset Your Password',
    html: html
  };
  
  await getTransporter().sendMail(mailOptions);
}

module.exports = {
  // ... existing exports
  sendPasswordReset
};
```

2. Use in `server.js`:
```javascript
emailService.sendPasswordReset(user, token).catch(err =>
  console.error('Failed to send password reset:', err)
);
```

### Use Email Templates from Files

1. Create `templates/welcome.html`
2. Install template engine: `npm install handlebars`
3. Load and compile:
```javascript
const Handlebars = require('handlebars');
const fs = require('fs').promises;

const template = Handlebars.compile(
  await fs.readFile('./templates/welcome.html', 'utf8')
);

const html = template({ name: user.name, url: CLIENT_URL });
```

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `EMAIL_HOST` | No | smtp.gmail.com | SMTP server hostname |
| `EMAIL_PORT` | No | 587 | SMTP port (587 TLS, 465 SSL) |
| `EMAIL_USER` | No* | - | SMTP username/email |
| `EMAIL_PASS` | No* | - | SMTP password/API key |
| `EMAIL_FROM` | No | noreply@luxora.com | Sender email address |
| `CLIENT_URL` | No | http://localhost:3000 | Frontend URL for links |

*Required for email functionality to work

## Code Examples

### Check if Email is Configured

```javascript
if (emailService.isEmailConfigured()) {
  await emailService.sendWelcomeEmail(user);
} else {
  console.log('Email not configured');
}
```

### Send Custom Email

```javascript
const transporter = emailService.getTransporter();

await transporter.sendMail({
  from: '"Luxora" <noreply@luxora.com>',
  to: user.email,
  subject: 'Custom Subject',
  html: '<h1>Hello!</h1>',
  text: 'Hello!'
});
```

## Testing Checklist

- [ ] Email service configured in `.env`
- [ ] Server restarted after configuration
- [ ] Welcome email sends on registration
- [ ] Booking confirmation sends to guest
- [ ] Host notification sends to property owner
- [ ] Emails appear professional in inbox
- [ ] Plain text version works
- [ ] Links in emails work correctly
- [ ] Mobile responsive design
- [ ] No errors in server logs

## Support

For issues or questions:
1. Check server console logs
2. Verify `.env` configuration
3. Test with Ethereal/Mailtrap first
4. Review Nodemailer docs: https://nodemailer.com
5. Check email provider's SMTP settings

---

**Email notifications are now live in Luxora!** 🎉📧
