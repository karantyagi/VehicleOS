/**
 * The unauthenticated product moment. This deliberately stays illustrative:
 * it makes the promise of calm ownership without inventing data about a car
 * the visitor has not added yet.
 */
export function LoginValueSpotlight() {
  return (
    <figure className="login-concierge relative mx-auto w-full max-w-[35rem]" aria-label="VehicleOS quiet concierge">
      <header className="login-concierge__intro relative z-[1] max-w-xl">
        <p className="login-concierge__eyebrow">Quiet concierge</p>
        <h2 className="login-concierge__title mt-3 text-balance text-3xl font-semibold tracking-[-0.035em] text-foreground sm:text-4xl">
          Your car, handled.
        </h2>
        <p className="login-concierge__story mt-3 max-w-lg text-[15px] leading-7 text-muted-foreground sm:text-base">
          Start with your car. VehicleOS keeps the rest in calm order.
        </p>
      </header>

      <div className="login-concierge__scene relative mt-8 overflow-hidden rounded-[1.9rem] border border-primary/15" aria-hidden>
        <div className="login-concierge__glow login-concierge__glow--one" />
        <div className="login-concierge__glow login-concierge__glow--two" />
        <div className="login-concierge__orb login-concierge__orb--one" />
        <div className="login-concierge__orb login-concierge__orb--two" />
        <div className="login-concierge__road" />

        <div className="login-concierge__focus">
          <span className="login-concierge__focus-index">01</span>
          <div>
            <p>One thing at a time</p>
            <strong>Start with your car</strong>
          </div>
        </div>

        <div className="login-concierge__vehicle">
          <svg viewBox="0 0 352 176" fill="none" xmlns="http://www.w3.org/2000/svg" role="presentation">
            <path d="M46 113.5C51.6 90.6 62.7 74 89 67.6L131.8 43.5C142.4 37.5 154.3 34.4 166.5 34.4H224.6C239.7 34.4 253.9 40.6 263.5 51.6L291.2 83.3C306.7 85.3 318.8 97.7 318.8 113.8V123.3H304.2C302.5 141.5 287.2 155.6 268.5 155.6C249.8 155.6 234.5 141.5 232.8 123.3H123.5C121.8 141.5 106.5 155.6 87.8 155.6C69.1 155.6 53.8 141.5 52.1 123.3H36V116.5C36 114.8 37.4 113.5 39.1 113.5H46Z" className="login-concierge__vehicle-shell" />
            <path d="M100.5 67.7L138.5 47.5C147.1 42.9 156.7 40.5 166.5 40.5H219.8C231.1 40.5 241.8 44.7 249.5 52.4L274 77.1H98.5L100.5 67.7Z" className="login-concierge__vehicle-glass" />
            <path d="M114 77.1L139.7 51.5M207.7 40.7L210.2 77.1M274.4 77.1H290.2M128.1 117.9H232.3" className="login-concierge__vehicle-detail" />
            <circle cx="87.8" cy="121.8" r="19.7" className="login-concierge__wheel" />
            <circle cx="87.8" cy="121.8" r="7" className="login-concierge__wheel-center" />
            <circle cx="268.5" cy="121.8" r="19.7" className="login-concierge__wheel" />
            <circle cx="268.5" cy="121.8" r="7" className="login-concierge__wheel-center" />
            <path d="M42 105.6H62.5M290.7 105.6H311" className="login-concierge__headlights" />
          </svg>
        </div>

        <div className="login-concierge__scene-label">VehicleOS</div>

        <div className="login-concierge__horizon">
          <div className="login-concierge__horizon-item login-concierge__horizon-item--now">
            <span className="login-concierge__horizon-mark" />
            <div>
              <p>Now</p>
              <strong>Your car</strong>
            </div>
          </div>
          <div className="login-concierge__horizon-item">
            <span className="login-concierge__horizon-mark" />
            <div>
              <p>Soon</p>
              <strong>OEM schedule</strong>
            </div>
          </div>
          <div className="login-concierge__horizon-item">
            <span className="login-concierge__horizon-mark" />
            <div>
              <p>Later</p>
              <strong>History remembered</strong>
            </div>
          </div>
        </div>
      </div>

      <figcaption className="sr-only">
        VehicleOS starts with your car, then keeps its maintenance schedule and service history in calm order.
      </figcaption>
    </figure>
  );
}
