import {
  ArrowLeft,
  Check,
  Clock,
  Users,
  ChevronRight,
  Wifi,
  BatteryFull,
  MapPin,
  Plus,
  AlertCircle,
  LoaderCircle,
  ShoppingBag,
  Star,
} from "lucide-react";
import type { Group, JourneyEvent, Participant } from "../data";
export function Phone({
  group,
  event,
  participant,
}: {
  group: Group;
  event: JourneyEvent;
  participant: Participant;
}) {
  const screen = event.screen,
    isHost = participant.role === "Host",
    isRestaurant = screen === "restaurant",
    isCart = screen === "cart",
    isInvite = screen === "invite",
    isSuccess = screen === "success",
    isFailed = screen === "failed",
    isExpired = screen === "expired",
    isConfused = screen === "confused",
    isLoading = screen === "loading",
    isWaiting = screen === "waiting",
    isPay = screen === "pay",
    split = group.paymentType === "split";
  return (
    <div className="phone" data-testid="phone" data-screen={screen}>
      <div className="phone-status">
        <b>12:30</b>
        <span className="camera" />
        <span>
          <Wifi size={13} />
          <BatteryFull size={17} />
        </span>
      </div>
      <div className="phone-app">
        <div className="mobile-top">
          <ArrowLeft size={17} />
          <span className="gather-logo">
            gather<span>✳</span>
          </span>
          <ShoppingBag size={17} />
        </div>
        {isRestaurant ? (
          <>
            <div className="mobile-location">
              <MapPin size={11} /> Lunch at the studio{" "}
              <ChevronRight size={11} />
            </div>
            <div className="food-hero">
              <img
                src={`${import.meta.env.BASE_URL}sesame-bowl.svg`}
                alt="Original illustration of a sesame bowl with rice and greens"
              />
              <span>GOOD FOOD. BETTER TOGETHER.</span>
            </div>
            <div className="mobile-body">
              <h2>The Green Table</h2>
              <p className="restaurant-meta">
                <Star size={11} fill="currentColor" />
                4.9 · Bowls & everyday goodness
              </p>
              <div className="mobile-chips">
                <span>20–30 min</span>
                <span>$0 delivery</span>
              </div>
              <h3>Make it a shared lunch.</h3>
              <p>
                Everyone picks their favorite.
                <br />
                One delivery, right to your door.
              </p>
              <div className="mobile-cta">
                Start a group order <Users size={14} />
              </div>
            </div>
          </>
        ) : isSuccess ? (
          <div className="mobile-body success-screen">
            <div className="success-orbit">
              <Check size={34} />
            </div>
            <span className="mobile-eyebrow">GOOD CHOICES, EVERYONE</span>
            <h2>Lunch is on its way.</h2>
            <p>
              The Green Table has confirmed
              <br />
              your group’s order.
            </p>
            <div className="receipt">
              <small>Estimated arrival</small>
              <strong>12:55 – 13:05</strong>
              <div>
                <span>{group.size} people</span>
                <span>{group.orderId}</span>
              </div>
            </div>
            <div className="mobile-cta">
              Track your order <ArrowLeft className="rotate" size={15} />
            </div>
            <small className="mobile-muted">
              All required payments authorized.
            </small>
          </div>
        ) : isExpired ? (
          <div className="mobile-body state-screen">
            <div className="state-icon">
              <Clock size={32} />
            </div>
            <h2>Time got away.</h2>
            <p>The group’s order deadline has passed. No order was placed.</p>
            <div className="mobile-callout">
              Your cart is saved.
              <br />
              Start a new group when everyone’s ready.
            </div>
            <div className="mobile-cta">Start another group</div>
            <small className="mobile-muted">You haven’t been charged.</small>
          </div>
        ) : (
          <>
            <div className="mobile-body">
              <div className="mobile-eyebrow">THE GREEN TABLE</div>
              <h2>
                {isInvite
                  ? "Lunch, together."
                  : isCart
                    ? "A little of everything."
                    : isPay || isFailed
                      ? "Your part of the order."
                      : isWaiting
                        ? "Waiting on the group."
                        : isConfused
                          ? "Who pays for what?"
                          : "One last thing."}
              </h2>
              <div className="mobile-group">
                <div className="mini-avatars">
                  {["A", "S", "M"].map((n) => (
                    <span key={n}>{n}</span>
                  ))}
                </div>
                <span>Alex’s group · {group.size} people</span>
                <span className="mobile-tag">
                  {split ? "Split pay" : "One payer"}
                </span>
              </div>
              {isInvite ? (
                <>
                  <div className="invite-card">
                    <Users size={25} />
                    <strong>Good food is a group thing.</strong>
                    <p>
                      {isHost
                        ? "Your invitation is ready to share."
                        : "You’re in. Add something delicious."}
                    </p>
                    <div className="invite-url">
                      gather.demo / lunch / {group.id.slice(3)}
                    </div>
                  </div>
                  <div className="mobile-list-title">
                    AT THE TABLE <span>{group.size} joined</span>
                  </div>
                  {["Alex", "Sam", "Maya"].slice(0, group.size).map((n, i) => (
                    <div className="person-row" key={n}>
                      <span className="person-avatar">{n[0]}</span>
                      <span>
                        {n}
                        {i === 0 ? " (host)" : ""}
                      </span>
                      <Check size={14} />
                    </div>
                  ))}
                  <div className="mobile-cta">
                    Browse the menu <ChevronRight size={14} />
                  </div>
                </>
              ) : isCart ? (
                <>
                  <div className="mobile-list-title">
                    YOUR PICKS <span>Made fresh</span>
                  </div>
                  <div className="food-item">
                    <img
                      src={`${import.meta.env.BASE_URL}sesame-bowl.svg`}
                      alt="Roasted sesame bowl"
                    />
                    <div>
                      <strong>Roasted sesame bowl</strong>
                      <p>Brown rice · tahini dressing</p>
                      <b>$14.80</b>
                    </div>
                    <span className="qty">1</span>
                  </div>
                  <div className="food-item">
                    <img
                      src={`${import.meta.env.BASE_URL}salmon-bowl.svg`}
                      alt="Miso salmon bowl"
                    />
                    <div>
                      <strong>Miso salmon bowl</strong>
                      <p>Greens · pickled cucumber</p>
                      <b>$18.20</b>
                    </div>
                    <Plus size={14} />
                  </div>
                  <div className="mobile-callout">
                    <Check size={14} />
                    Your items are in the shared cart.
                  </div>
                  <div className="mobile-cta">
                    Review group order <ChevronRight size={14} />
                  </div>
                </>
              ) : (
                <>
                  <div className="mobile-order-item">
                    <img
                      src={`${import.meta.env.BASE_URL}sesame-bowl.svg`}
                      alt="Sesame bowl"
                    />
                    <div>
                      <strong>
                        {isPay || isFailed
                          ? "Your sesame bowl"
                          : "The group’s lunch"}
                      </strong>
                      <p>
                        {isPay || isFailed
                          ? "1 item · made just for you"
                          : `${group.size} meals · one happy table`}
                      </p>
                    </div>
                  </div>
                  <div className="payment-summary">
                    <div>
                      <span>
                        {isPay || isFailed ? "Your items" : "Group subtotal"}
                      </span>
                      <b>
                        {isPay || isFailed
                          ? "$14.80"
                          : `$${(group.size * 14.8).toFixed(2)}`}
                      </b>
                    </div>
                    <div>
                      <span>Delivery & service</span>
                      <b>
                        {isPay || isFailed
                          ? "$2.00"
                          : `$${(group.size * 2).toFixed(2)}`}
                      </b>
                    </div>
                    <div className="total">
                      <strong>
                        {isPay || isFailed ? "Your total" : "Order total"}
                      </strong>
                      <strong>
                        $
                        {((isPay || isFailed ? 1 : group.size) * 16.8).toFixed(
                          2,
                        )}
                      </strong>
                    </div>
                  </div>
                  {isFailed ? (
                    <div className="mobile-error">
                      <AlertCircle size={17} />
                      <div>
                        <strong>Your payment didn’t go through.</strong>
                        <p>
                          Your bank declined this payment. Try a different card.
                          You haven’t been charged.
                        </p>
                      </div>
                    </div>
                  ) : isWaiting ? (
                    <div className="mobile-wait">
                      <Clock size={18} />
                      <div>
                        <strong>
                          {group.outcome === "deadline_expired"
                            ? "Still waiting for everyone"
                            : "Sam’s payment is pending"}
                        </strong>
                        <p>
                          Your group order can’t be placed until everyone is
                          ready.
                        </p>
                      </div>
                    </div>
                  ) : isConfused ? (
                    <div className="mobile-explanation">
                      <strong>Pay separately. Eat together.</strong>
                      <p>
                        Each person pays their own share. The host places the
                        final order after everyone’s payment is authorized.
                      </p>
                      <small>
                        Your card is charged only when the order is confirmed.
                      </small>
                    </div>
                  ) : (
                    <div className="mobile-payment">
                      <span>
                        {split
                          ? "Everyone pays their share"
                          : "Host pays for the group"}
                      </span>
                      <ChevronRight size={14} />
                      <small>
                        {isHost
                          ? "You’ll place the order for everyone."
                          : "Visa •••• 4242"}
                      </small>
                    </div>
                  )}
                  <div
                    className={`mobile-cta ${isLoading ? "loading" : ""} ${isWaiting ? "disabled" : ""}`}
                  >
                    {isLoading ? (
                      <>
                        <LoaderCircle size={16} className="spin" />
                        Checking payments…
                      </>
                    ) : isFailed ? (
                      "Try a different card"
                    ) : isWaiting ? (
                      "Waiting for payments"
                    ) : isConfused ? (
                      "Got it"
                    ) : isPay ? (
                      "Pay my share · $16.80"
                    ) : (
                      "Place order"
                    )}
                    {event.tap && <span className="tap-ring" />}
                  </div>
                  <div className="mobile-bottom-note">
                    <Clock size={11} />
                    Group closes at 12:32:30
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
      <div className="home-indicator" />
    </div>
  );
}
