import { useState } from 'react';
import DatePicker from 'react-datepicker';
import { loadStripe } from '@stripe/stripe-js';
import { Calendar, Users, CreditCard, AlertCircle } from 'lucide-react';

// Initialize Stripe (use your publishable key)
const stripePromise = loadStripe('pk_test_YOUR_PUBLISHABLE_KEY_HERE');

export default function BookingForm({ listing, onClose }) {
  const [checkIn, setCheckIn] = useState(null);
  const [checkOut, setCheckOut] = useState(null);
  const [guests, setGuests] = useState(listing.baseGuests || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate nights and total price
  const calculatePrice = () => {
    if (!checkIn || !checkOut) return 0;
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    let total = nights * listing.price;
    
    // Add extra guest fee if applicable
    if (guests > listing.baseGuests) {
      const extraGuests = guests - listing.baseGuests;
      total += nights * extraGuests * listing.extraGuestFee;
    }
    
    return total;
  };

  const nights = checkIn && checkOut 
    ? Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24))
    : 0;
  const totalPrice = calculatePrice();

  const handleBooking = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!checkIn || !checkOut) {
      setError('Please select check-in and check-out dates');
      return;
    }

    if (guests < 1 || guests > listing.maxGuests) {
      setError(`Guests must be between 1 and ${listing.maxGuests}`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please login to book');
        setLoading(false);
        return;
      }

      // Create Stripe Checkout Session
      const response = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          listingId: listing.id,
          startDate: checkIn.toISOString(),
          endDate: checkOut.toISOString(),
          guests
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: data.sessionId
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.message || 'Failed to process booking');
      setLoading(false);
    }
  };

  return (
    <div className="booking-form-overlay" onClick={onClose}>
      <div className="booking-form-modal" onClick={(e) => e.stopPropagation()}>
        <div className="booking-form-header">
          <h2>Book {listing.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleBooking} className="booking-form">
          {error && (
            <div className="booking-error">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}

          <div className="booking-section">
            <label className="booking-label">
              <Calendar size={18} />
              Check-in
            </label>
            <DatePicker
              selected={checkIn}
              onChange={setCheckIn}
              selectsStart
              startDate={checkIn}
              endDate={checkOut}
              minDate={new Date()}
              dateFormat="MMM d, yyyy"
              placeholderText="Select date"
              className="booking-date-input"
            />
          </div>

          <div className="booking-section">
            <label className="booking-label">
              <Calendar size={18} />
              Check-out
            </label>
            <DatePicker
              selected={checkOut}
              onChange={setCheckOut}
              selectsEnd
              startDate={checkIn}
              endDate={checkOut}
              minDate={checkIn || new Date()}
              dateFormat="MMM d, yyyy"
              placeholderText="Select date"
              className="booking-date-input"
            />
          </div>

          <div className="booking-section">
            <label className="booking-label">
              <Users size={18} />
              Guests
            </label>
            <div className="guest-controls">
              <button
                type="button"
                className="guest-btn"
                onClick={() => setGuests(Math.max(1, guests - 1))}
                disabled={guests <= 1}
              >
                -
              </button>
              <span className="guest-count">{guests}</span>
              <button
                type="button"
                className="guest-btn"
                onClick={() => setGuests(Math.min(listing.maxGuests, guests + 1))}
                disabled={guests >= listing.maxGuests}
              >
                +
              </button>
            </div>
            <p className="guest-info">Max {listing.maxGuests} guests</p>
          </div>

          {nights > 0 && (
            <div className="booking-summary">
              <div className="summary-row">
                <span>${listing.price} × {nights} nights</span>
                <span>${listing.price * nights}</span>
              </div>
              {guests > listing.baseGuests && (
                <div className="summary-row">
                  <span>Extra guest fee ({guests - listing.baseGuests} guests × {nights} nights)</span>
                  <span>${(guests - listing.baseGuests) * nights * listing.extraGuestFee}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total</span>
                <span>${totalPrice}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="booking-submit-btn"
            disabled={loading || !checkIn || !checkOut}
          >
            {loading ? (
              'Processing...'
            ) : (
              <>
                <CreditCard size={20} />
                Proceed to Payment
              </>
            )}
          </button>

          <p className="booking-note">
            You won't be charged yet. Review your booking on the next page.
          </p>
        </form>
      </div>
    </div>
  );
}
