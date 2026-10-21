import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  organizationCode = '';
  email = '';
  password = '';
  errorMessage = '';

  constructor(private router: Router, private auth: AuthService) {}

  login() {
    this.errorMessage = '';
    this.auth.login({ organizationCode: this.organizationCode, email: this.email, password: this.password })
      .subscribe({ next: () => this.router.navigate(['/dashboard']), error: error => {
        this.errorMessage = error.error?.message ?? 'Unable to sign in. Check the API server and credentials.';
      }});
  }
}
