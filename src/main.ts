import { bootstrapApplication } from '@angular/platform-browser';
import { provideZoneChangeDetection } from '@angular/core';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, {
  // Angular v21 is zoneless by default. We switch to Zone.js for maximum compatibility
  // (and because our Three.js event handlers run outside Angular templates).
  providers: [provideZoneChangeDetection()],
}).catch((err) => console.error(err));
