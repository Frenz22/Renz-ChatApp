# Chat App with Task Tagging

Live demo: https://renz-chatapp.onrender.com/

if you dont want to make an account use 
Username : user
Password : 123456

## Why I built this

Around the time I started job hunting, there was that whole trend of Discord getting banned/restricted in different places, and it got me thinking about how they work under the hood. I needed a solid portfolio project anyway, so instead of doing another to-do list or weather app clone, I decided to build my own real-time chat app from scratch — and push it a bit further than a basic clone by adding a tagging.

## What it does

It's a real-time chat app where you can:

- **Sign up and log in** with a username and password (passwords are hashed, not stored in plain text)
- **Chat in real time** with other logged-in users — messages show up instantly, no refreshing
- **See who's online** at any given moment
- **Tag any message as a task** and assign it to one or more users — so if someone says "don't forget to fix the login bug," you can turn that message directly into a task instead of it getting lost in the chat
- **Track tasks** in a "My Tasks" sidebar, mark them done, reopen them, or delete them (only the person who created a task can delete it)

That task-tagging feature is the part I'm proudest of — it's basically mixing a chat app with a lightweight task manager, since a lot of real team conversations end up with action items buried inside them.

## Tech stack

- **Backend:** Node.js + Express
- **Real-time communication:** Socket.IO
- **Database:** MongoDB with Mongoose
- **Auth:** JWT tokens + bcrypt for password hashing
- **Frontend:** Plain HTML, CSS, and vanilla JavaScript (no framework — wanted to understand the fundamentals before reaching for React)

## Deployment

I'm deploying this on Render, specifically because Socket.IO needs a long-running server with persistent WebSocket connections — serverless platforms spin functions up and down per request, which breaks real-time connections. Render runs this as a normal, always-on-while-active Node process, so Socket.IO works the way it's supposed to, and unlike some alternatives.

One tradeoff worth knowing: Render's free web services spin down after 15 minutes of no traffic and take 30-60 seconds to wake back up on the next request. So if nobody's used the live link in a while, the first load after that will feel slow before it kicks back in — that's expected, not a bug.

**MongoDB** is hosted separately on MongoDB Atlas's, and Render connects to it over the internet using the same `MONGODB_URI` from the `.env` setup.

## A note on where I'm at

I built this to learn — real-time systems, auth, and database design all in one project. It's not perfect, but that's kind of the point: I wanted something I actually built and understand end to end, not just a tutorial I followed along with.
