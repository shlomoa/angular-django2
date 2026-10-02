// Begin import section
import { Component } from '@angular/core';
import { ContactCard } from './contact-card/contact-card';
// End import section

@Component({
  selector: 'app-profile-card',
  imports: [ContactCard],
  templateUrl: './profile-card.html',
  styleUrl: './profile-card.scss',
})
export class ProfileCard {
  // Begin injected services section
  // End injected services section
  // Begin input signals section
  // End input signals section
  // Begin output signals section
  // End output signals section
}
