import { bootstrapApplication } from '@angular/platform-browser';
import { register } from 'swiper/element/bundle';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

register();   // registers <swiper-container> web components (testimonial slider)
bootstrapApplication(AppComponent, appConfig).catch(err => console.error(err));
