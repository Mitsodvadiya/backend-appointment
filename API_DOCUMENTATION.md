# Clinic Queue API Documentation

## Base URL
`/api`

## Authentication

Protected routes require a JWT token in the `Authorization` header.
Format: `Bearer <token>`

---

## Patient Authentication

### 1. Send OTP
Sends an OTP to the provided phone number. In development mode (`NODE_ENV !== 'production'`), it mocks the MSG91 API response.

- **URL:** `/auth/send-otp`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "phone": "string (Required. Example: 919876543210)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "OTP sent successfully",
  "data": {
    "type": "success",
    "message": "Mock OTP sent successfully" // Or MSG91 response data
  }
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Phone number is required"
}
```
- **Code:** 500 Internal Server Error
```json
{
  "error": "Failed to send OTP"
}
```

---

### 2. Verify OTP
Verifies the provided OTP against the given phone number.
In development mode (`NODE_ENV !== 'production'`), the mock OTP is always `123456`.

- **URL:** `/auth/verify-otp`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "phone": "string (Required. Example: 919876543210)",
  "otp": "string (Required. Example: 123456)"
}
```

#### Success Response
Returns a JWT token, the patient object, and a redirection intent. 
If the patient's name is not set, `redirectTo` will be `"ONBOARDING"`, otherwise `"DASHBOARD"`.

- **Code:** 200 OK
```json
{
  "message": "OTP verified successfully",
  "token": "eyJhbGciOiJIUzI1...",
  "refreshToken": "eyJhbGciOiJIUzI1...",
  "redirectTo": "ONBOARDING",
  "patient": {
    "id": "uuid-string",
    "phone": "919876543210",
    "name": null,
    "age": null,
    "gender": null,
    "address": null,
    "createdAt": "2023-10-25T10:00:00.000Z",
    "updatedAt": "2023-10-25T10:00:00.000Z",
    "deletedAt": null
  }
}
```

#### Error Response
- **Code:** 400 Bad Request (Missing fields)
```json
{
  "error": "Phone number and OTP are required"
}
```
- **Code:** 400 Bad Request (Invalid OTP)
```json
{
  "error": "Invalid OTP"
}
```

}
```

---

### 3. Refresh Token (Mobile App)
Refreshes the Patient's short-lived access token using their long-lived refresh token.

- **URL:** `/auth/patient-refresh`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "refreshToken": "string (Required. The long-lived JWT refresh token)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "token": "new-eyJhbGciOiJIUzI1...",
  "refreshToken": "new-eyJhbGciOiJIUzI1..."
}
```

#### Error Response
- **Code:** 401 Unauthorized
```json
{
  "error": "Refresh token is required in the request body" 
  // OR "Invalid refresh token"
}
```

----------------------------------------------------------------------------

### 3. Complete Profile
Updates the profile information of the authenticated patient.

- **URL:** `/patient/complete-profile`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <JWT>`)

#### Request Body
All fields are optional, you only need to pass the fields you wish to update.
```json
{
  "name": "string",
  "age": "number",
  "gender": "MALE | FEMALE | OTHER",
  "address": "string"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Profile completed successfully",
  "patient": {
    "id": "uuid-string",
    "phone": "919876543210",
    "name": "John Doe",
    "age": 30,
    "gender": "MALE",
    "address": "123 Main St",
    "createdAt": "2023-10-25T10:00:00.000Z",
    "updatedAt": "2023-10-25T10:05:00.000Z",
    "deletedAt": null
  }
}
```

#### Error Response
- **Code:** 401 Unauthorized
```json
{
  "error": "Authorization header is missing" 
  // OR "Unauthorized"
}
```
- **Code:** 403 Forbidden
```json
{
  "error": "Token is invalid or expired"
}
```
- **Code:** 500 Internal Server Error
```json
{
  "error": "Failed to complete profile"
}
```

### 4. Search Patient by Phone
Retrieves a complete patient profile by exactly matching their phone number. Used by clinic staff to quickly pull up returning patients.

- **URL:** `/patient/search?phone=<number>`
- **Method:** `GET`
- **Auth Required:** Yes (`CLINIC_ADMIN`, `DOCTOR`, or `STAFF`)

#### Query Parameters
- **`phone`** (Required) - The registered phone number of the patient.

#### Success Response
- **Code:** 200 OK
```json
{
  "id": "uuid-string",
  "phone": "919876543210",
  "name": "John Doe",
  "age": 30,
  "gender": "MALE",
  "address": "123 Main St",
  "createdAt": "2023-10-25T10:00:00.000Z",
  "updatedAt": "2023-10-25T10:05:00.000Z",
  "deletedAt": null
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Phone number is required"
}
```

- **Code:** 403 Forbidden
```json
{
  "error": "Access denied. Insufficient permissions."
}
```

- **Code:** 404 Not Found
```json
{
  "error": "Patient not found"
}
```

---
------------------------------------------------------------------------------------------------------
## Web Portal Authentication

### 1. Register User
Registers a new clinic admin or web user. The account will be inactive by default until the email is verified via the activation link sent to the user's email.

- **URL:** `/auth/register`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "name": "string (Required. Example: Dr. Smith)",
  "email": "string (Required. Example: admin@clinic.com)",
  "password": "string (Required. Example: mySuperSecretPassword)"
}
```

#### Success Response
- **Code:** 201 Created
```json
{
  "message": "Registration successful. Please check your email to activate your account."
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Name, email, and password are required" 
  // OR "Email is already registered"
}
```

---

### 2. Activate Account
Activates the user's account using the JWT token sent securely to their email. On success, it instantly returns the fully authenticated user payload with a session token suitable for auto-login.

- **URL:** `/auth/activate/:token`
- **Method:** `GET`
- **Auth Required:** No (Token is in URL parameter)

#### Parameters
- **`token`** (Path Parameter) - The secure JWT string containing the user's email payload.

#### Success Response
- **Code:** 200 OK
- **Headers:** `Set-Cookie: refreshToken=eyJhb...; HttpOnly; Secure; SameSite=Strict`
```json
{
  "message": "Account activated successfully",
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "uuid-string",
    "name": "Dr. Smith",
    "email": "admin@clinic.com",
    "role": "CLINIC_ADMIN"
  }
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "User not found" 
  // OR "Account is already activated"
}
```
*Note: If the JWT signature is invalid or expired, `jsonwebtoken` will emit a generic internal error message natively.*

---

### 3. Login
Standard password-based authentication for active web portal users.

- **URL:** `/auth/login`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "email": "string (Required. Example: admin@clinic.com)",
  "password": "string (Required. Example: mySuperSecretPassword)"
}
```

#### Success Response
- **Code:** 200 OK
- **Headers:** `Set-Cookie: refreshToken=eyJhb...; HttpOnly; Secure; SameSite=Strict`
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "uuid-string",
    "name": "Dr. Smith",
    "email": "admin@clinic.com",
    "role": "CLINIC_ADMIN"
  }
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Email and password are required"
}
```
- **Code:** 401 Unauthorized
```json
{
  "error": "Invalid credentials" 
}
```

---

### 4. Refresh Token (Web Portal)
Silently refreshes the web portal user's short-lived access token by validating their HTTP-Only `refreshToken` cookie.

- **URL:** `/auth/refresh`
- **Method:** `POST`
- **Auth Required:** No (Token is managed automatically via cookies)

#### Request Requirements
- Browser must include credentials (cookies) in the request.

#### Success Response
- **Code:** 200 OK
- **Headers:** `Set-Cookie: refreshToken=new-eyJhb...; HttpOnly; Secure; SameSite=Strict`
```json
{
  "token": "new-eyJhbGciOiJIUzI1..."
}
```

#### Error Response
- **Code:** 401 Unauthorized
```json
{
  "error": "Refresh token not found" 
  // OR "Invalid refresh token"
}
```

---

### 5. Logout (Web Portal)
Clears the HTTP-Only `refreshToken` cookie from the user's browser, securely logging them out.

- **URL:** `/auth/logout`
- **Method:** `POST`
- **Auth Required:** No

#### Success Response
- **Code:** 200 OK
- **Headers:** `Set-Cookie: refreshToken=; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
{
  "message": "Logged out successfully"
}
```

---

### 6. Forgot Password (Web Portal)
Initiates the password reset flow. If the provided email exists and is active, a short-lived password reset link will be sent to the user's email address.

- **URL:** `/auth/forgot-password`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "email": "string (Required. Example: admin@clinic.com)"
}
```

#### Success Response
To prevent email enumeration attacks, this API intentionally always returns a 200 OK whether the email exists in the database or not.
- **Code:** 200 OK
```json
{
  "message": "If that email is registered, a password reset link has been sent."
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Email is required"
}
```

---

### 7. Reset Password (Web Portal)
Completes the password reset flow by verifying the short-lived JWT token (from their email link) and updating the user's hashed password in the database.

- **URL:** `/auth/reset-password`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "token": "string (Required. Extracted from the email link URL parameter)",
  "newPassword": "string (Required. Must be at least 6 characters)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Password has been successfully reset"
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Token and new password are required" 
  // OR "Password reset link has expired. Please request a new one."
  // OR "Failed to reset password. The link may be invalid."
}
```

---

### 8. Get Current Profile (Web Portal)
Retrieves the profile of the currently authenticated web user, encompassing their standard details alongside an array of every clinic they are affiliated with.

- **URL:** `/auth/me`
- **Method:** `GET`
- **Auth Required:** Yes (`Bearer <JWT>`)

#### Success Response
- **Code:** 200 OK
```json
{
  "user": {
    "id": "uuid-string",
    "name": "Dr. Smith",
    "email": "admin@clinic.com",
    "phone": "919876543210",
    "role": "CLINIC_ADMIN",
    "isActive": true,
    "isAvailable": true,
    "createdAt": "2023-10-25T10:00:00.000Z",
    "updatedAt": "2023-10-26T10:00:00.000Z",
    "deletedAt": null,
    "clinicMembers": [
      {
        "id": "uuid-string",
        "clinicId": "uuid-clinic-1",
        "userId": "uuid-string",
        "role": "CLINIC_ADMIN",
        "createdAt": "2023-10-25T10:05:00.000Z",
        "clinic": {
          "id": "uuid-clinic-1",
          "name": "City Hospital",
          "address": "123 Main St, New York",
          "phone": "919876543210",
          "createdAt": "2023-10-25T10:05:00.000Z",
          "updatedAt": "2023-10-25T10:05:00.000Z",
          "deletedAt": null
        }
      }
    ]
  }
}
```

#### Error Response
- **Code:** 401 Unauthorized
```json
{
  "error": "Unauthorized" 
}
```

---

### 9. Update Current Profile (Web Portal)
Updates the `name` and/or `phone` number of the currently authenticated web user. Sensitive attributes like `email` or `role` are strictly immutable via this endpoint.

- **URL:** `/auth/me`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <JWT>`)

#### Request Body
Both fields are discretionary. Submit only what requires updating.
```json
{
  "name": "string (Optional)",
  "phone": "string (Optional)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "uuid-string",
    "name": "Dr. John Smith",
    "email": "admin@clinic.com",
    "phone": "919876543211",
    "role": "CLINIC_ADMIN",
    // ... including nested clinicMembers structure
  }
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Failed to update profile"
}
```
- **Code:** 401 Unauthorized
```json
{
  "error": "Unauthorized" 
}
```

---
------------------------------------------------------------------------------------------------------
## Clinic Management

### 1. Get All Clinics (Public API)
Retrieves a list of all fully available, active clinics. This endpoint is purposefully public primarily for patients/apps to view the directory of clinics.

- **URL:** `/clinic/`
- **Method:** `GET`
- **Auth Required:** No

#### Success Response
- **Code:** 200 OK
```json
[
  {
    "id": "uuid-clinic-1",
    "name": "City Hospital",
    "address": "123 Main St, New York",
    "phone": "919876543210",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T10:00:00.000Z",
    "deletedAt": null
  },
  {
    "id": "uuid-clinic-2",
    "name": "Downtown Clinic",
    "address": "456 Side St, New York",
    "phone": "919876543211",
    "createdAt": "2023-11-02T10:00:00.000Z",
    "updatedAt": "2023-11-02T10:00:00.000Z",
    "deletedAt": null
  }
]
```

#### Error Response
- **Code:** 500 Internal Server Error
```json
{
  "error": "Failed to fetch clinics"
}
```

---

### 2. Get Clinic Doctors (Public API)
Retrieves a list of all active and available doctors associated with a specific clinic. This endpoint is purposefully public for patients/apps to view the list of doctors available at a clinic.

- **URL:** `/clinic/:id/doctors`
- **Method:** `GET`
- **Auth Required:** No

#### Parameters
- **`id`** (Path Parameter) - The unique ID of the clinic.

#### Success Response
- **Code:** 200 OK
```json
[
  {
    "id": "uuid-clinicMember-string",
    "clinicId": "uuid-clinic-string",
    "userId": "uuid-user-string",
    "role": "DOCTOR",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "user": {
      "id": "uuid-user-string",
      "name": "Dr. Jane Doe",
      "email": "doctor@clinic.com",
      "phone": "919876543210",
      "role": "DOCTOR",
      "isActive": true,
      "isAvailable": true,
      "createdAt": "2023-11-01T10:00:00.000Z",
      "updatedAt": "2023-11-01T10:05:00.000Z"
    }
  }
]
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Clinic ID is required" // OR "Clinic not found"
}
```

---

### 3. Create Clinic
Creates a new clinic. The clinic is associated with the active user who is assigned as a `CLINIC_ADMIN` member of this new clinic.

- **URL:** `/clinic/`
- **Method:** `POST`
- **Auth Required:** Yes (`Bearer <JWT>` with role `CLINIC_ADMIN`)

#### Request Body
```json
{
  "name": "string (Required. Example: City Hospital)",
  "address": "string (Required. Example: 123 Main St, New York)",
  "phone": "string (Optional. Example: 919876543210)"
}
```

#### Success Response
- **Code:** 201 Created
```json
{
  "message": "Clinic created successfully",
  "clinic": {
    "id": "uuid-string",
    "name": "City Hospital",
    "address": "123 Main St, New York",
    "phone": "919876543210",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T10:00:00.000Z",
    "deletedAt": null
  }
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Name and address are required"
}
```
- **Code:** 401 Unauthorized
```json
{
  "error": "Unauthorized to create clinic"
}
```
- **Code:** 403 Forbidden
```json
{
  "error": "Access denied. Insufficient permissions."
}
```

---

### 2. Update Clinic
Updates an existing clinic's details.

- **URL:** `/clinic/:id`
- **Method:** `PUT`
- **Auth Required:** Yes (`Bearer <JWT>` with role `CLINIC_ADMIN`)

#### Parameters
- **`id`** (Path Parameter) - The unique ID of the clinic to update.

#### Request Body
All fields are optional, you only need to pass the fields you wish to update.
```json
  {
    "name": "string",
    "address": "string",
    "phone": "string"
  }
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Clinic updated successfully",
  "clinic": {
    "id": "uuid-string",
    "name": "City Hospital (Updated)",
    "address": "123 Main St, New York",
    "phone": "919876543210",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T10:10:00.000Z",
    "deletedAt": null
  }
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Clinic ID is required" // OR "Failed to update clinic"
}
```
- **Code:** 403 Forbidden
```json
{
  "error": "Access denied. Insufficient permissions."
}
```

---

### 3. Invite Clinic Member
Invites a new member to the clinic. An email is sent to the provided email address containing an invitation link with a secure token. Creates an inactive `User` and `ClinicMember` record.

- **URL:** `/clinic/:id/invite`
- **Method:** `POST`
- **Auth Required:** Yes (`Bearer <JWT>` with role `CLINIC_ADMIN`)

#### Parameters
- **`id`** (Path Parameter) - The unique ID of the clinic.

#### Request Body
```json
{
  "email": "string (Required. Example: doctor@clinic.com)",
  "name": "string (Required. Example: Dr. Jane Doe)",
  "role": "string (Required. Example: DOCTOR | STAFF | CLINIC_ADMIN)",
  "phone": "string (Optional. Example: 919876543210)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Invitation sent successfully",
  "user": {
    "id": "uuid-string",
    "name": "Dr. Jane Doe",
    "email": "doctor@clinic.com",
    "role": "DOCTOR",
    "isActive": false,
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T10:00:00.000Z",
    "deletedAt": null
  }
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Email, name, and role are required" 
  // OR "User with this email already exists and is active"
}
```
- **Code:** 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```
- **Code:** 403 Forbidden
```json
{
  "error": "Access denied. Insufficient permissions."
}
```

---

### 4. Activate Clinic Member
Activates the invited member's account, sets their password, and logs them in via returning an auth token and setting an HTTP-Only refresh token cookie.

- **URL:** `/clinic/activate-member`
- **Method:** `POST`
- **Auth Required:** No

#### Request Body
```json
{
  "token": "string (Required. Extracted from the email invitation link)",
  "newPassword": "string (Required. Must be at least 6 characters)"
}
```

#### Success Response
- **Code:** 200 OK
- **Headers:** `Set-Cookie: refreshToken=eyJhb...; HttpOnly; Secure; SameSite=Strict`
```json
{
  "message": "Account activated successfully",
  "token": "eyJhbGciOiJIUzI1...",
  "user": {
    "id": "uuid-string",
    "name": "Dr. Jane Doe",
    "email": "doctor@clinic.com",
    "role": "DOCTOR"
  },
  "clinic": {
    "id": "uuid-string",
    "name": "City Hospital",
    "address": "123 Main St, New York"
  }
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Invite link has expired. Please request a new one." 
  // OR "Failed to activate account. The link may be invalid."
  // OR "Account is already activated"
}
```

---

### 5. Get Clinic Members
Retrieves a list of all members associated with a specific clinic, along with their core User profiles.

- **URL:** `/clinic/:id/members`
- **Method:** `GET`
- **Auth Required:** Yes (`Bearer <JWT>` with role `CLINIC_ADMIN`)

#### Parameters
- **`id`** (Path Parameter) - The unique ID of the clinic.

#### Success Response
- **Code:** 200 OK
```json
[
  {
    "id": "uuid-clinicMember-string",
    "clinicId": "uuid-clinic-string",
    "userId": "uuid-user-string",
    "role": "DOCTOR",
    "createdAt": "2023-11-01T10:00:00.000Z",
    "user": {
      "id": "uuid-user-string",
      "name": "Dr. Jane Doe",
      "email": "doctor@clinic.com",
      "phone": "919876543210",
      "role": "DOCTOR",
      "isActive": true,
      "isAvailable": true,
      "createdAt": "2023-11-01T10:00:00.000Z",
      "updatedAt": "2023-11-01T10:05:00.000Z"
    }
  }
]
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "Clinic ID is required" // OR "Clinic not found"
}
```
- **Code:** 403 Forbidden
```json
{
  "error": "Access denied. Insufficient permissions."
}
```

---

### 6. Update Clinic Member Status
Updates the `isActive` state of a specific member inside the clinic. Used to activate or deactivate accounts locally.

- **URL:** `/clinic/:id/members/:userId/status`
- **Method:** `PATCH`
- **Auth Required:** Yes (`Bearer <JWT>` with role `CLINIC_ADMIN`)

#### Parameters
- **`id`** (Path Parameter) - The unique ID of the clinic.
- **`userId`** (Path Parameter) - The unique `User.id` belonging to the clinic member to update.

#### Request Body
```json
{
  "isActive": "boolean (Required. true or false)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Member status updated successfully",
  "user": {
    "id": "uuid-user-string",
    "name": "Dr. Jane Doe",
    "email": "doctor@clinic.com",
    "phone": "919876543210",
    "role": "DOCTOR",
    "isActive": false,
    "isAvailable": true,
    "createdAt": "2023-11-01T10:00:00.000Z",
    "updatedAt": "2023-11-01T10:10:00.000Z"
  }
}
```

#### Error Response
- **Code:** 400 Bad Request
```json
{
  "error": "isActive boolean flag is required" 
  // OR "User is not a member of this clinic"
}
```
- **Code:** 403 Forbidden
```json
{
  "error": "Access denied. Insufficient permissions."
}
```

------------------------------------------------------------------------------------------------------
## Doctor Schedule & Leaves Management

### 1. Doctor Schedule - Get Working Hours
Fetches the designated weekly recurring schedule blocks for a specific doctor.

- **URL:** `/doctor/:clinicId/:doctorId/schedule`
- **Method:** `GET`
- **Auth Required:** No (Public or authenticated)

#### Response
- **Code:** 200 OK
```json
[
  {
    "id": "uuid",
    "doctorId": "doc-uuid",
    "clinicId": "clinic-uuid",
    "dayOfWeek": 1, 
    "startTime": "09:00",
    "endTime": "13:00",
    "slotDuration": 15,
    "maxTokens": null,
    "createdAt": "2023-11-01T10:00:00.000Z"
  }
]
```

### 2. Doctor Schedule - Bulk Update Working Hours
Replaces the doctor's entire weekly schedule with the new payload payload. Used for bulk saving changes.

- **URL:** `/doctor/:clinicId/:doctorId/schedule`
- **Method:** `POST`
- **Auth Required:** Yes (`CLINIC_ADMIN` or the specific `DOCTOR`)

#### Request Body
```json
[
  {
    "dayOfWeek": 1,
    "startTime": "09:00",
    "endTime": "13:00",
    "slotDuration": 15,
    "maxTokens": 10
  },
  {
    "dayOfWeek": 1,
    "startTime": "14:00",
    "endTime": "18:00",
    "slotDuration": 15
  }
]
```

### 3. Doctor Leaves - Get Leaves
Fetches exceptions/leaves when the doctor is not available. Also supports optional query params.

- **URL:** `/doctor/:clinicId/:doctorId/leaves?startDate=2024-01-01&endDate=2024-02-01`
- **Method:** `GET`
- **Auth Required:** No

#### Response
- **Code:** 200 OK
```json
[
  {
    "id": "uuid",
    "doctorId": "doc-uuid",
    "clinicId": "clinic-uuid",
    "date": "2024-01-15T00:00:00.000Z",
    "reason": "Personal Leave",
    "createdAt": "2023-11-01T10:00:00.000Z"
  }
]
```

### 4. Doctor Leaves - Bulk Document Leaves
Record specific dates when a doctor is not actively working. Overrides their regular schedule rule.

- **URL:** `/doctor/:clinicId/:doctorId/leaves`
- **Method:** `POST`
- **Auth Required:** Yes (`CLINIC_ADMIN` or the specific `DOCTOR`)

#### Request Body
```json
[
  { "date": "2024-01-15", "reason": "Personal Leave" },
  { "date": "2024-01-16", "reason": "Sick Leave" }
]
```

### 5. Doctor Leaves - Delete a Leave
Delete an existing leave if it is cancelled.

- **URL:** `/doctor/:clinicId/leaves/:leaveId`
- **Method:** `DELETE`
- **Auth Required:** Yes (`CLINIC_ADMIN` or `DOCTOR`)

------------------------------------------------------------------------------------------------------
## Queue Management

### 1. Get Current Queue
Retrieves the currently active queue session for a given doctor in a specific clinic. If no active queue exists for today, a new one is created.

- **URL:** `/queue/current?doctorId=<id>&clinicId=<id>`
- **Method:** `GET`
- **Auth Required:** No

#### Query Parameters
- **`doctorId`** (Required) - ID of the doctor
- **`clinicId`** (Required) - ID of the clinic

#### Success Response
- **Code:** 200 OK
```json
{
  "id": "uuid-queue",
  "clinicId": "uuid-clinic",
  "doctorId": "uuid-doctor",
  "date": "2023-11-01T00:00:00.000Z",
  "status": "ACTIVE",
  "currentToken": 0,
  "lastToken": 0,
  "totalTokens": 0
}
```

### 2. Get Queue Details
Retrieves details of a specific queue session, including all tokens that are either in `WAITING` or `IN_PROGRESS` state.

- **URL:** `/queue/:queueId`
- **Method:** `GET`
- **Auth Required:** No

#### Parameters
- **`queueId`** (Path Parameter) - ID of the queue session

#### Success Response
- **Code:** 200 OK
```json
{
  "id": "uuid-queue",
  "tokens": [
    {
      "id": "uuid-token",
      "tokenNumber": 1,
      "status": "WAITING",
      "visit": {
        "patient": {}
      }
    }
  ]
}
```

### 3. Call Next Token
Calls the next waiting token in the queue, updating its status to `IN_PROGRESS` and setting the queue's `currentToken`.

- **URL:** `/queue/call-next`
- **Method:** `POST`
- **Auth Required:** Yes

#### Request Body
```json
{
  "queueId": "string (Required)",
  "userId": "string (Required. The ID of the staff/doctor calling the token)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Token called",
  "tokenNumber": 1
}
```

### 4. Pause Queue
Temporarily halts the queue session. The queue status becomes `BREAK`.

- **URL:** `/queue/pause`
- **Method:** `POST`
- **Auth Required:** Yes (Must be the specific Doctor assigned to the queue)

#### Request Body
```json
{
  "queueId": "string (Required)",
  "userId": "string (Required. ID of the doctor pausing the queue)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Queue paused successfully"
}
```

#### Error Response
- **Code:** 403 Forbidden
```json
{
  "message": "Only the designated doctor can pause this queue."
}
```

### 5. Resume Queue
Resumes a temporarily halted queue session. The queue status becomes `ACTIVE`.

- **URL:** `/queue/resume`
- **Method:** `POST`
- **Auth Required:** Yes (Must be the specific Doctor assigned to the queue)

#### Request Body
```json
{
  "queueId": "string (Required)",
  "userId": "string (Required. ID of the doctor resuming the queue)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Queue resumed successfully"
}
```

#### Error Response
- **Code:** 403 Forbidden
```json
{
  "message": "Only the designated doctor can resume this queue."
}
```

### 6. Close Queue
Marks a queue session as `CLOSED`.

- **URL:** `/queue/close`
- **Method:** `POST`
- **Auth Required:** Yes (Must be the specific Doctor assigned to the queue)

#### Request Body
```json
{
  "queueId": "string (Required)",
  "userId": "string (Required. ID of the doctor closing the queue)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Queue closed"
}
```

#### Error Response
- **Code:** 403 Forbidden
```json
{
  "message": "Only the designated doctor can close this queue."
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Queue closed"
}
```

------------------------------------------------------------------------------------------------------
## Token Management

### 1. Create Token (Add Patient to Queue)
Creates a new token and adds a patient to the current active queue for a specific doctor.

- **URL:** `/queue/tokens`
- **Method:** `POST`
- **Auth Required:** Yes

#### Request Body
```json
{
  "doctorId": "string (Required)",
  "clinicId": "string (Required)",
  "patientId": "string (Required)",
  "reason": "string (Optional)",
  "source": "string (Optional. Default: WALK_IN | ONLINE | KIOSK)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "tokenId": "uuid-token",
  "tokenNumber": 5
}
```

### 2. Get Token Status
Retrieves the real-time status of a specific token, including how many people are ahead in the queue.

- **URL:** `/queue/tokens/:id`
- **Method:** `GET`
- **Auth Required:** No

#### Parameters
- **`id`** (Path Parameter) - Token ID

#### Success Response
- **Code:** 200 OK
```json
{
  "tokenNumber": 5,
  "status": "WAITING",
  "currentToken": 2,
  "peopleAhead": 3
}
```

### 3. Complete Token
Marks a token as `COMPLETED`.

- **URL:** `/queue/tokens/:id/complete`
- **Method:** `POST`
- **Auth Required:** Yes

#### Parameters
- **`id`** (Path Parameter) - Token ID

#### Request Body
```json
{
  "userId": "string (Required. ID of the staff/doctor completing the token)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Token completed"
}
```

### 4. Skip Token
Marks a token as `SKIPPED`.

- **URL:** `/queue/tokens/:id/skip`
- **Method:** `POST`
- **Auth Required:** Yes

#### Parameters
- **`id`** (Path Parameter) - Token ID

#### Request Body
```json
{
  "userId": "string (Required. ID of the staff/doctor skipping the token)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Token skipped"
}
```

### 5. Cancel Token
Marks a token as `CANCELLED`.

- **URL:** `/queue/tokens/:id/cancel`
- **Method:** `POST`
- **Auth Required:** Yes

#### Parameters
- **`id`** (Path Parameter) - Token ID

#### Request Body
```json
{
  "userId": "string (Required. ID of the staff/doctor cancelling the token)"
}
```

#### Success Response
- **Code:** 200 OK
```json
{
  "message": "Token cancelled"
}
```
