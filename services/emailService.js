const nodemailer = require('nodemailer');

// Email configuration from environment variables
const EMAIL_HOST = process.env.EMAIL_HOST || 'smtp.gmail.com';
const EMAIL_PORT = process.env.EMAIL_PORT || 587;
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@luxora.com';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Create reusable transporter
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465, // true for 465, false for other ports
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });
  }
  return transporter;
}

// Check if email is configured
function isEmailConfigured() {
  return EMAIL_USER && EMAIL_PASS;
}

// Send booking confirmation email
async function sendBookingConfirmation(booking) {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping booking confirmation email');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { user, listing, checkIn: checkInDate, checkOut: checkOutDate, guests, totalPrice } = booking;
    
    const checkIn = new Date(checkInDate).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const checkOut = new Date(checkOutDate).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff385c 0%, #ff5575 50%, #ff967d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #666; }
          .value { font-weight: 600; }
          .price-total { font-size: 24px; color: #ff385c; font-weight: bold; text-align: center; margin: 20px 0; }
          .button { display: inline-block; background: #ff385c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${user.name},</p>
            <p>Great news! Your booking has been confirmed. We can't wait to host you!</p>
            
            <div class="card">
              <h2 style="margin-top: 0;">${listing.title}</h2>
              <p style="color: #666; margin: 0;">${listing.city}, ${listing.country || 'USA'}</p>
              
              <div style="margin-top: 20px;">
                <div class="detail-row">
                  <span class="label">Check-in</span>
                  <span class="value">${checkIn}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Check-out</span>
                  <span class="value">${checkOut}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Duration</span>
                  <span class="value">${nights} night${nights !== 1 ? 's' : ''}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Guests</span>
                  <span class="value">${guests} guest${guests !== 1 ? 's' : ''}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Booking ID</span>
                  <span class="value">#${booking.id}</span>
                </div>
              </div>
              
              <div class="price-total">
                Total Paid: $${totalPrice}
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${CLIENT_URL}" class="button">View My Bookings</a>
            </div>
            
            <div class="card" style="background: #fffbf0; border-left: 4px solid #ff385c;">
              <h3 style="margin-top: 0;">📋 What's Next?</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>You'll receive check-in instructions from your host closer to your arrival date</li>
                <li>Feel free to message your host if you have any questions</li>
                <li>Review our cancellation policy in your booking details</li>
              </ul>
            </div>
            
            <p>If you have any questions, please don't hesitate to reach out to your host or our support team.</p>
            
            <p>Safe travels!<br><strong>The Luxora Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This is an automated email from Luxora. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Luxora. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Luxora" <${EMAIL_FROM}>`,
      to: user.email,
      subject: `Booking Confirmed - ${listing.title}`,
      html: html,
      text: `Booking Confirmed!\n\nHi ${user.name},\n\nYour booking has been confirmed!\n\nProperty: ${listing.title}\nLocation: ${listing.city}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nGuests: ${guests}\nTotal: $${totalPrice}\nBooking ID: #${booking.id}\n\nView your booking at ${CLIENT_URL}\n\nThank you for choosing Luxora!`
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`Booking confirmation email sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return { success: false, error: error.message };
  }
}

// Send welcome email to new users
async function sendWelcomeEmail(user) {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping welcome email');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff385c 0%, #ff5575 50%, #ff967d 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 32px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .feature { display: flex; align-items: start; margin: 15px 0; }
          .feature-icon { font-size: 24px; margin-right: 15px; }
          .button { display: inline-block; background: #ff385c; color: white; padding: 14px 40px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: 600; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏡 Welcome to Luxora!</h1>
          </div>
          <div class="content">
            <p style="font-size: 18px;">Hi ${user.name},</p>
            <p>Welcome to Luxora! We're thrilled to have you join our community of travelers and hosts.</p>
            
            <div class="card">
              <h2 style="margin-top: 0;">✨ What You Can Do</h2>
              
              <div class="feature">
                <span class="feature-icon">🔍</span>
                <div>
                  <strong>Discover Amazing Places</strong>
                  <p style="margin: 5px 0; color: #666;">Browse thousands of unique stays around the world with advanced search and map features.</p>
                </div>
              </div>
              
              <div class="feature">
                <span class="feature-icon">💳</span>
                <div>
                  <strong>Book with Confidence</strong>
                  <p style="margin: 5px 0; color: #666;">Secure payments, instant confirmation, and 24/7 support for peace of mind.</p>
                </div>
              </div>
              
              <div class="feature">
                <span class="feature-icon">🏠</span>
                <div>
                  <strong>Become a Host</strong>
                  <p style="margin: 5px 0; color: #666;">Share your space and earn money by listing your property on Luxora.</p>
                </div>
              </div>
              
              <div class="feature">
                <span class="feature-icon">⭐</span>
                <div>
                  <strong>Read & Write Reviews</strong>
                  <p style="margin: 5px 0; color: #666;">Help the community by sharing your experiences and reading feedback from others.</p>
                </div>
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${CLIENT_URL}" class="button">Start Exploring</a>
            </div>
            
            <div class="card" style="background: #f0f8ff; border-left: 4px solid #ff385c;">
              <h3 style="margin-top: 0;">💡 Pro Tips</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Complete your profile to build trust with hosts</li>
                <li>Add properties to your wishlist to track favorites</li>
                <li>Use filters and map view to find the perfect stay</li>
                <li>Message hosts directly with any questions</li>
              </ul>
            </div>
            
            <p>If you have any questions or need assistance, our support team is always here to help.</p>
            
            <p>Happy travels!<br><strong>The Luxora Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This is an automated email from Luxora. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Luxora. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Luxora" <${EMAIL_FROM}>`,
      to: user.email,
      subject: 'Welcome to Luxora - Start Your Journey! 🎉',
      html: html,
      text: `Welcome to Luxora!\n\nHi ${user.name},\n\nWelcome to Luxora! We're excited to have you join our community.\n\nWith Luxora, you can:\n- Discover amazing places around the world\n- Book stays with secure payments\n- Become a host and earn money\n- Read and write reviews\n\nGet started at ${CLIENT_URL}\n\nHappy travels!\nThe Luxora Team`
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`Welcome email sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
}

// Send host booking notification
async function sendHostBookingNotification(booking) {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping host notification email');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { user, listing, checkIn: checkInDate, checkOut: checkOutDate, guests, totalPrice } = booking;
    
    const checkIn = new Date(checkInDate).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    const checkOut = new Date(checkOutDate).toLocaleDateString('en-US', { 
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
    });
    
    const nights = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24));

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ff385c 0%, #ff5575 50%, #ff967d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .detail-row:last-child { border-bottom: none; }
          .label { color: #666; }
          .value { font-weight: 600; }
          .earnings { font-size: 24px; color: #27ae60; font-weight: bold; text-align: center; margin: 20px 0; }
          .button { display: inline-block; background: #ff385c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎊 New Booking Received!</h1>
          </div>
          <div class="content">
            <p>Hi ${listing.host.name},</p>
            <p>Great news! You have a new booking for your listing.</p>
            
            <div class="card">
              <h2 style="margin-top: 0;">${listing.title}</h2>
              
              <div style="margin-top: 20px;">
                <div class="detail-row">
                  <span class="label">Guest</span>
                  <span class="value">${user.name}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Check-in</span>
                  <span class="value">${checkIn}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Check-out</span>
                  <span class="value">${checkOut}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Duration</span>
                  <span class="value">${nights} night${nights !== 1 ? 's' : ''}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Guests</span>
                  <span class="value">${guests} guest${guests !== 1 ? 's' : ''}</span>
                </div>
                <div class="detail-row">
                  <span class="label">Booking ID</span>
                  <span class="value">#${booking.id}</span>
                </div>
              </div>
              
              <div class="earnings">
                Earnings: $${totalPrice}
              </div>
            </div>
            
            <div style="text-align: center;">
              <a href="${CLIENT_URL}" class="button">View Booking Details</a>
            </div>
            
            <div class="card" style="background: #fffbf0; border-left: 4px solid #ff385c;">
              <h3 style="margin-top: 0;">📋 Next Steps</h3>
              <ul style="margin: 0; padding-left: 20px;">
                <li>Prepare your property for the guest's arrival</li>
                <li>Send check-in instructions before their arrival date</li>
                <li>Be available to answer any questions from your guest</li>
                <li>Ensure a great experience to get positive reviews</li>
              </ul>
            </div>
            
            <p>Thank you for being an amazing host on Luxora!</p>
            
            <p>Best regards,<br><strong>The Luxora Team</strong></p>
          </div>
          
          <div class="footer">
            <p>This is an automated email from Luxora. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} Luxora. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"Luxora" <${EMAIL_FROM}>`,
      to: listing.host.email,
      subject: `New Booking - ${listing.title}`,
      html: html,
      text: `New Booking Received!\n\nHi ${listing.host.name},\n\nYou have a new booking for ${listing.title}!\n\nGuest: ${user.name}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nGuests: ${guests}\nEarnings: $${totalPrice}\nBooking ID: #${booking.id}\n\nView details at ${CLIENT_URL}\n\nThank you for hosting on Luxora!`
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`Host notification email sent to ${listing.host.email}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending host notification email:', error);
    return { success: false, error: error.message };
  }
}

// Send review notification to host
async function sendReviewNotification(review) {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping review notification');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { booking, user } = review;
    const hostEmail = booking.listing.host.email;
    const hostName = booking.listing.host.name;
    const listingTitle = booking.listing.title;
    
    const stars = '⭐'.repeat(review.overallRating);

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff385c 0%, #ff5575 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .rating { font-size: 32px; margin: 20px 0; }
            .review-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff385c; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #ff385c; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📝 New Review Received!</h1>
            </div>
            <div class="content">
              <p>Hi ${hostName},</p>
              <p><strong>${user.name}</strong> just left a review for <strong>${listingTitle}</strong>!</p>
              
              <div class="rating">${stars}</div>
              <p style="font-size: 18px; color: #ff385c;"><strong>${review.overallRating} out of 5 stars</strong></p>
              
              ${review.comment ? `
                <div class="review-box">
                  <p style="font-style: italic; margin: 0;">"${review.comment}"</p>
                </div>
              ` : ''}
              
              ${review.cleanlinessRating || review.accuracyRating || review.locationRating ? `
                <h3>Rating Breakdown:</h3>
                <ul>
                  ${review.cleanlinessRating ? `<li>Cleanliness: ${review.cleanlinessRating}/5</li>` : ''}
                  ${review.accuracyRating ? `<li>Accuracy: ${review.accuracyRating}/5</li>` : ''}
                  ${review.checkInRating ? `<li>Check-in: ${review.checkInRating}/5</li>` : ''}
                  ${review.communicationRating ? `<li>Communication: ${review.communicationRating}/5</li>` : ''}
                  ${review.locationRating ? `<li>Location: ${review.locationRating}/5</li>` : ''}
                  ${review.valueRating ? `<li>Value: ${review.valueRating}/5</li>` : ''}
                </ul>
              ` : ''}
              
              <p>You can respond to this review to show your appreciation or address any concerns.</p>
              
              <a href="${CLIENT_URL}" class="button">View Review & Respond</a>
              
              <div class="footer">
                <p>Thank you for being a great host on Luxora!</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: `"Luxora" <${EMAIL_FROM}>`,
      to: hostEmail,
      subject: `New Review - ${listingTitle}`,
      html: html,
      text: `New Review Received!\n\nHi ${hostName},\n\n${user.name} just left a ${review.overallRating}-star review for ${listingTitle}!\n\n${review.comment ? `"${review.comment}"\n\n` : ''}You can respond to this review at ${CLIENT_URL}\n\nThank you for hosting on Luxora!`
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`Review notification sent to ${hostEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending review notification:', error);
    return { success: false, error: error.message };
  }
}

// Send host response notification to guest
async function sendHostResponseNotification(data) {
  if (!isEmailConfigured()) {
    console.log('Email not configured, skipping host response notification');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const { guestName, guestEmail, listingTitle, hostResponse } = data;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff385c 0%, #ff5575 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .response-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #ff385c; margin: 20px 0; }
            .button { display: inline-block; padding: 12px 24px; background: #ff385c; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>💬 The Host Responded to Your Review!</h1>
            </div>
            <div class="content">
              <p>Hi ${guestName},</p>
              <p>The host of <strong>${listingTitle}</strong> has responded to your review!</p>
              
              <div class="response-box">
                <p style="font-style: italic; margin: 0;">"${hostResponse}"</p>
              </div>
              
              <a href="${CLIENT_URL}" class="button">View Full Review</a>
              
              <div class="footer">
                <p>Thank you for being part of the Luxora community!</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const mailOptions = {
      from: `"Luxora" <${EMAIL_FROM}>`,
      to: guestEmail,
      subject: `Host Response - ${listingTitle}`,
      html: html,
      text: `Host Response!\n\nHi ${guestName},\n\nThe host of ${listingTitle} has responded to your review:\n\n"${hostResponse}"\n\nView the full review at ${CLIENT_URL}\n\nThank you for being part of Luxora!`
    };

    await getTransporter().sendMail(mailOptions);
    console.log(`Host response notification sent to ${guestEmail}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending host response notification:', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendBookingConfirmation,
  sendWelcomeEmail,
  sendHostBookingNotification,
  sendReviewNotification,
  sendHostResponseNotification,
  isEmailConfigured
};
