# Clinic Queue API Documentation

## Global Response Format
All API responses follow a uniform JSON structure.

**Success Response (2xx HTTP code):**
```json
{
  "status": 200,
  "message": "Human-readable success message",
  "data": { /* Endpoint specific payload */ }
}
```

**Error Response (4xx/5xx HTTP code):**
```json
{
  "status": 400,
  "message": "Human-readable error message",
  "error": { /* Detailed error object (optional in prod) */ }
}
```

*Note: Below, under "Response Data", only the `data` portion of the standard wrapper is shown for brevity.*

---

## 📑 Table of Contents
1. [🔐 Auth Module](#-auth-module)
2. [🏥 Clinic Module](#-clinic-module)
3. [👨‍⚕️ Doctor Module](#-doctor-module)
4. [🧑‍🤝‍🧑 Patient Module](#-patient-module)
5. [🚥 Queue & Token Module](#-queue--token-module)

---

## 🔐 Auth Module

### Web Portal Authentication (Email/Password)

#### 1. Register Web User
- **Method:** `POST`
- **Endpoint:** `/api/auth/register`
- **Auth Required:** No
- **Request Body:**
```json
{
  "name": "Dr. Smith",
  "email": "admin@clinic.com",
  "password": "mySuperSecretPassword"
}
```
- **Response Data:** None. (Returns a success message to verify email).

#### 2. Activate Web User
- **Method:** `GET`
- **Endpoint:** `/api/auth/activate/:token`
- **Auth Required:** No (Token in URL)
- **Response Data:**
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid-string",
    "email": "admin@clinic.com",
    "role": "CLINIC_ADMIN"
  },
  "clinic": {
    "id": "uuid-clinic",
    "name": "City Hospital",
    "address": "123 Main St",
    "phone": "919876543210"
  } // OR null
}
```

#### 3. Login Web User
- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Auth Required:** No
- **Request Body:**
```json
{
  "email": "admin@clinic.com",
  "password": "mySuperSecretPassword"
}
```
- **Response Data:**
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid-string",
    "email": "admin@clinic.com",
    "role": "CLINIC_ADMIN"
  },
  "clinic": {
    "id": "uuid-clinic",
    "name": "City Hospital",
    "address": "123 Main St",
    "phone": "919876543210"
  } // OR null
}
```
*Note: Sets HttpOnly cookie `refreshToken`.*

#### 4. Refresh Web Token
- **Method:** `POST`
- **Endpoint:** `/api/auth/refresh`
- **Auth Required:** Auto (via HttpOnly Cookie)
- **Response Data:**
```json
{
  "token": "new-eyJhbGciOiJ..."
}
```

#### 5. Logout Web User
- **Method:** `POST`
- **Endpoint:** `/api/auth/logout`
- **Auth Required:** Auto
- **Response Data:** None. (Clears `refreshToken` cookie).

#### 6. Forget Password
- **Method:** `POST`
- **Endpoint:** `/api/auth/forgot-password`
- **Auth Required:** No
- **Request Body:**
```json
{
  "email": "admin@clinic.com"
}
```
- **Response Data:** None.

#### 7. Reset Password
- **Method:** `POST`
- **Endpoint:** `/api/auth/reset-password`
- **Auth Required:** No
- **Request Body:**
```json
{
  "token": "email-link-token",
  "newPassword": "newSecurePassword123"
}
```
- **Response Data:** None.

#### 8. Get Current Profile
- **Method:** `GET`
- **Endpoint:** `/api/auth/me`
- **Auth Required:** Yes (Web Token)
- **Response Data:**
```json
{
  "user": {
    "id": "uuid-string",
    "name": "Dr. Smith",
    "email": "admin@clinic.com",
    "role": "CLINIC_ADMIN",
    "clinicMembers": [
      {
         "clinicId": "uuid-clinic-1",
         "role": "CLINIC_ADMIN",
         "clinic": {
            "name": "City Hospital",
            "address": "123 Main St"
         }
      }
    ]
  },
  "clinic": {
    "id": "uuid-clinic-1",
    "name": "City Hospital",
    "address": "123 Main St",
    "phone": "919876543210"
  } // OR null
}
```

#### 9. Update Current Profile
- **Method:** `PATCH`
- **Endpoint:** `/api/auth/me`
- **Auth Required:** Yes (Web Token)
- **Request Body:**
```json
{
  "name": "Dr. John Smith",
  "phone": "919876543210"
}
```
- **Response Data:** (Returns the updated user object, similar to `/api/auth/me`).

---

### Mobile App Authentication (OTP based)

#### 1. Send OTP
- **Method:** `POST`
- **Endpoint:** `/api/auth/send-otp`
- **Auth Required:** No
- **Request Body:**
```json
{
  "phone": "919876543210"
}
```
- **Response Data:** (Returns MSG91 response or Mock success).

#### 2. Verify OTP & Login
- **Method:** `POST`
- **Endpoint:** `/api/auth/verify-otp`
- **Auth Required:** No
- **Request Body:**
```json
{
  "phone": "919876543210",
  "otp": "123456"
}
```
- **Response Data:**
```json
{
  "token": "eyJhbGciOi...",
  "refreshToken": "eyJhbGciOi...",
  "patient": {
    "id": "uuid-string",
    "phone": "919876543210"
  }
}
```

#### 3. Refresh Patient Token
- **Method:** `POST`
- **Endpoint:** `/api/auth/patient-refresh`
- **Auth Required:** No
- **Request Body:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```
- **Response Data:**
```json
{
  "token": "new-eyJhbGciOi...",
  "refreshToken": "new-eyJhbGciOi..."
}
```

---

## 🏥 Clinic Module

#### 1. List All Active Clinics (Public)
- **Method:** `GET`
- **Endpoint:** `/api/clinic/`
- **Auth Required:** No
- **Response Data:**
```json
[
  {
    "id": "uuid-clinic-1",
    "name": "City Hospital",
    "address": "123 Main St, New York",
    "phone": "919876543210"
  }
]
```

#### 2. Create a Clinic
- **Method:** `POST`
- **Endpoint:** `/api/clinic/`
- **Auth Required:** Yes (`CLINIC_ADMIN`)
- **Request Body:**
```json
{
  "name": "City Hospital",
  "address": "123 Main St, New York",
  "phone": "919876543210"
}
```
- **Response Data:**
```json
{
  "clinic": {
    "id": "uuid-string",
    "name": "City Hospital",
    "address": "123 Main St, New York"
  }
}
```

#### 3. Update a Clinic
- **Method:** `PUT`
- **Endpoint:** `/api/clinic/:id`
- **Auth Required:** Yes (`CLINIC_ADMIN`)
- **Request Body:**
```json
{
  "name": "City Hospital (Updated)",
  "phone": "919876543211"
}
```
- **Response Data:** (Returns the updated Clinic object).

#### 4. List Active Doctors at a Clinic (Public)
- **Method:** `GET`
- **Endpoint:** `/api/clinic/:id/doctors`
- **Auth Required:** No
- **Response Data:**
```json
[
  {
    "id": "uuid-clinicMember-string",
    "role": "DOCTOR",
    "user": {
       "id": "uuid-user-string",
       "name": "Dr. Jane Doe",
       "email": "doctor@clinic.com"
    }
  }
]
```

#### 5. List All Members of a Clinic
- **Method:** `GET`
- **Endpoint:** `/api/clinic/:id/members`
- **Auth Required:** Yes (`CLINIC_ADMIN`)
- **Response Data:** (Returns an array of `ClinicMember` objects, including inactive members).

#### 6. Invite a Staff Member or Doctor
- **Method:** `POST`
- **Endpoint:** `/api/clinic/:id/invite`
- **Auth Required:** Yes (`CLINIC_ADMIN`)
- **Request Body:**
```json
{
  "email": "doctor@clinic.com",
  "name": "Dr. Jane Doe",
  "role": "DOCTOR",
  "phone": "919876543210"
}
```
- **Response Data:** (Returns the created inactive `User` object).

#### 7. Activate an Invited Staff Member
- **Method:** `POST`
- **Endpoint:** `/api/clinic/activate-member`
- **Auth Required:** No
- **Request Body:**
```json
{
  "token": "email-invitation-token",
  "newPassword": "mySecurePassword123"
}
```
- **Response Data:**
```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": "uuid-user",
    "role": "DOCTOR"
  },
  "clinic": {
    "id": "uuid-clinic",
    "name": "City Hospital"
  }
}
```

#### 8. Toggle Member Status
- **Method:** `PATCH`
- **Endpoint:** `/api/clinic/:id/members/:userId/status`
- **Auth Required:** Yes (`CLINIC_ADMIN`)
- **Request Body:**
```json
{
  "isActive": false
}
```
- **Response Data:** (Returns the updated `User` object).

---

## 👨‍⚕️ Doctor Module

#### 1. Get Doctor's Weekly Schedule
- **Method:** `GET`
- **Endpoint:** `/api/doctor/:clinicId/:doctorId/schedule`
- **Auth Required:** No
- **Response Data:**
```json
[
  {
    "id": "uuid",
    "dayOfWeek": 1, 
    "startTime": "09:00",
    "endTime": "13:00",
    "slotDuration": 15,
    "maxTokens": null
  }
]
```

#### 2. Bulk Update Doctor's Schedule
- **Method:** `POST`
- **Endpoint:** `/api/doctor/:clinicId/:doctorId/schedule`
- **Auth Required:** Yes (`CLINIC_ADMIN` or specific `DOCTOR`)
- **Request Body:**
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
- **Response Data:** None.

#### 3. Get Doctor's Leaves
- **Method:** `GET`
- **Endpoint:** `/api/doctor/:clinicId/:doctorId/leaves?startDate=2024-01-01&endDate=2024-02-01`
- **Auth Required:** No
- **Response Data:**
```json
[
  {
    "id": "uuid",
    "date": "2024-01-15T00:00:00.000Z",
    "reason": "Personal Leave"
  }
]
```

#### 4. Bulk Document Leaves
- **Method:** `POST`
- **Endpoint:** `/api/doctor/:clinicId/:doctorId/leaves`
- **Auth Required:** Yes (`CLINIC_ADMIN` or specific `DOCTOR`)
- **Request Body:**
```json
[
  { "date": "2024-01-15", "reason": "Personal Leave" },
  { "date": "2024-01-16", "reason": "Sick Leave" }
]
```
- **Response Data:** None.

#### 5. Delete a Leave
- **Method:** `DELETE`
- **Endpoint:** `/api/doctor/:clinicId/leaves/:leaveId`
- **Auth Required:** Yes (`CLINIC_ADMIN` or specific `DOCTOR`)
- **Response Data:** None.

#### 6. Get Patient History Overview (For Doctors)
- **Method:** `GET`
- **Endpoint:** `/api/doctor/:doctorId/patient/:patientId`
- **Auth Required:** Yes (`CLINIC_ADMIN` or specific `DOCTOR`)
- **Response Data:**
```json
{
  "id": "patient-uuid",
  "phone": "91987654321",
  "name": "Jane Doe",
  "visits": [
    {
      "id": "visit-uuid",
      "reason": "Regular Checkup",
      "clinic": {
        "id": "clinic-id",
        "name": "City Hospital"
      },
      "tokens": [
        {
          "id": "token-uuid",
          "tokenNumber": 4,
          "status": "COMPLETED"
        }
      ]
    }
  ]
}
```

---

## 🧑‍🤝‍🧑 Patient Module

#### 1. Update Patient Profile
- **Method:** `PATCH`
- **Endpoint:** `/api/patient/complete-profile`
- **Auth Required:** Yes (Patient App Token)
- **Request Body:**
```json
{
  "name": "Jane Doe",
  "age": 28,
  "gender": "FEMALE",
  "address": "456 Elm St"
}
```
- **Response Data:**
```json
{
  "patient": {
     "id": "uuid",
     "name": "Jane Doe",
     "phone": "919876543210",
     "age": 28,
     "gender": "FEMALE",
     "address": "456 Elm St"
  }
}
```

#### 2. Search Patient Precisely by Phone 
- **Method:** `GET`
- **Endpoint:** `/api/patient/search?phone=919876543210`
- **Auth Required:** Yes (Staff/Doctor Token)
- **Response Data:** (Returns the `Patient` object without nested visit history).

---

## 🚥 Queue & Token Module

### Active Queue Sessions

#### 1. Get Today's Queue Session
- **Method:** `GET`
- **Endpoint:** `/api/queue/current?doctorId=<id>&clinicId=<id>`
- **Auth Required:** No
- **Response Data:**
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

#### 2. Get Queue Session Details (With Tokens)
- **Method:** `GET`
- **Endpoint:** `/api/queue/:queueId`
- **Auth Required:** No
- **Response Data:**
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

#### 3. Call Next Token
- **Method:** `POST`
- **Endpoint:** `/api/queue/call-next`
- **Auth Required:** Yes (Staff/Doctor)
- **Request Body:**
```json
{
  "queueId": "queue-uuid",
  "userId": "staff-or-doctor-uuid"
}
```
- **Response Data:**
```json
{
  "tokenNumber": 1
}
```

#### 4. Temporary Halt Queue (Break)
- **Method:** `POST`
- **Endpoint:** `/api/queue/pause`
- **Auth Required:** Yes (Assigned Doctor)
- **Request Body:**
```json
{
  "queueId": "queue-uuid",
  "userId": "doctor-uuid"
}
```
- **Response Data:** None. (Status becomes `BREAK`).

#### 5. Resume Halted Queue 
- **Method:** `POST`
- **Endpoint:** `/api/queue/resume`
- **Auth Required:** Yes (Assigned Doctor)
- **Request Body:**
```json
{
  "queueId": "queue-uuid",
  "userId": "doctor-uuid"
}
```
- **Response Data:** None. (Status becomes `ACTIVE`).

#### 6. Close Queue Permanently
- **Method:** `POST`
- **Endpoint:** `/api/queue/close`
- **Auth Required:** Yes (Assigned Doctor)
- **Request Body:**
```json
{
  "queueId": "queue-uuid",
  "userId": "doctor-uuid"
}
```
- **Response Data:** None. (Status becomes `CLOSED`).

### Tokens

#### 1. Create Token (Join Queue)
- **Method:** `POST`
- **Endpoint:** `/api/queue/tokens`
- **Auth Required:** Yes
- **Request Body:**
```json
{
  "doctorId": "doc-uuid",
  "clinicId": "clinic-uuid",
  "patientId": "patient-uuid",
  "reason": "Routine Checkup",
  "source": "WALK_IN"
}
```
- **Response Data:**
```json
{
  "tokenId": "uuid-token",
  "tokenNumber": 5
}
```

#### 2. Get Real-time Token Status via ID
- **Method:** `GET`
- **Endpoint:** `/api/queue/tokens/:id`
- **Auth Required:** No
- **Response Data:**
```json
{
  "tokenNumber": 5,
  "status": "WAITING",
  "currentToken": 2,
  "peopleAhead": 3
}
```

#### 3. Complete a Token
- **Method:** `POST`
- **Endpoint:** `/api/queue/tokens/:id/complete`
- **Auth Required:** Yes (Assigned Doctor)
- **Request Body:**
```json
{
  "userId": "doctor-uuid"
}
```
- **Response Data:** None.

#### 4. Skip a Token
- **Method:** `POST`
- **Endpoint:** `/api/queue/tokens/:id/skip`
- **Auth Required:** Yes (Assigned Doctor)
- **Request Body:**
```json
{
  "userId": "doctor-uuid"
}
```
- **Response Data:** None.

#### 5. Cancel a Token
- **Method:** `POST`
- **Endpoint:** `/api/queue/tokens/:id/cancel`
- **Auth Required:** Yes (Doctor/Patient)
- **Request Body:**
```json
{
  "userId": "doctor-or-patient-uuid"
}
```
- **Response Data:** None.
