import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div class="hero">
    <div class="card">
      <h1>Future of Web Development</h1>
      <p>Build stunning, lightning-fast websites with modern tools and a premium aesthetic. Ready to start your journey?</p>
      <button id="cta-button">Get Started Now</button>
    </div>
    
    <div class="features">
      <div class="feature-item">
        <h3>Lightning Fast</h3>
        <p>Optimized for performance and speed out of the box.</p>
      </div>
      <div class="feature-item">
        <h3>Modern Design</h3>
        <p>Clean, premium aesthetics that wow your users.</p>
      </div>
      <div class="feature-item">
        <h3>Responsive</h3>
        <p>Perfect viewing experience on any device or screen.</p>
      </div>
    </div>
  </div>
`

document.querySelector('#cta-button')?.addEventListener('click', () => {
  alert('Welcome to your new website! Let\'s start building something amazing.');
})
