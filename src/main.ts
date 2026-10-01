import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { SocialComponent } from './app/social.component';

const preview = new URLSearchParams(location.search).has('preview');
// Keep exactly one bootstrap host; the unused demo host has full-height styling.
document.querySelector(preview ? 'timrom-social' : 'timrom-app')?.remove();
bootstrapApplication(preview ? AppComponent : SocialComponent).catch(error => console.error('Angular bootstrap failed', error));
