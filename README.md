# Chat App with Task Tagging

## Why I built this

Around the time I started job hunting, there was that whole trend of Discord getting banned/restricted in different places, and it got me thinking about how they work under the hood. I needed a solid portfolio project anyway, so instead of doing another to-do list or weather app clone, I decided to build my own real-time chat app from scratch — and push it a bit further than a basic clone by adding task tagging.

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

I'm deploying this on Vercel because its free hosting options fit my needs and allow the app to remain available without requiring a paid hosting plan.

**MongoDB** is hosted separately on MongoDB Atlas, and the app connects to it over the internet using the `MONGODB_URI` environment variable configured in the deployment settings.

## A note on where I'm at

I built this to learn — real-time systems, auth, and database design all in one project. It's not perfect, but that's kind of the point: I wanted something I actually built and understand end to end, not just a tutorial I followed along with.
