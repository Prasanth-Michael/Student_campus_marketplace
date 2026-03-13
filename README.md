# Campus Service Marketplace Backend

This project includes a complete Node.js backend for a campus service marketplace where students can register, publish services, place orders, chat in real time, review completed work, and process Razorpay payments.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- Socket.IO for chat
- Razorpay for payments

## Project Structure

```text
backend/
  config/
  controllers/
  middleware/
  models/
  routes/
  sockets/
payment/
```

## Features

- User registration and login
- JWT protected routes
- Role-based access for providers and admins
- Service CRUD for providers
- Order creation and lifecycle updates
- Review submission after completed orders
- Real-time chat with Socket.IO
- Razorpay payment order creation and verification

## Setup

1. Install dependencies:

```bash
npm install
```

2. Update environment variables in `.env`:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/campus-service-marketplace
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://127.0.0.1:5500
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

3. Start the server:

```bash
npm run dev
```

## Main API Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/profile`

### Services

- `GET /api/services`
- `GET /api/services/:id`
- `GET /api/services/mine`
- `POST /api/services`
- `PUT /api/services/:id`
- `DELETE /api/services/:id`

### Orders

- `POST /api/orders`
- `GET /api/orders/mine`
- `GET /api/orders/:id`
- `PATCH /api/orders/:id/status`
- `POST /api/orders/:id/payment/create`
- `POST /api/orders/:id/payment/verify`

### Reviews

- `POST /api/reviews`
- `GET /api/reviews/service/:serviceId`
- `GET /api/reviews/provider/:providerId`

### Chat

- `GET /api/chat/conversations`
- `POST /api/chat/conversations`
- `GET /api/chat/conversations/:conversationId/messages`
- `POST /api/chat/messages`

## Socket Events

Client should connect with JWT token in `auth.token`.

- `conversation:join`
- `message:send`
- `message:new`
- `message:read`
- `conversation:updated`
- `chat:error`

## Notes

- A user can be both `student` and `provider`.
- Only completed orders can be reviewed.
- Regular users cannot self-assign the `admin` role.
- Razorpay endpoints work only when keys are configured.
