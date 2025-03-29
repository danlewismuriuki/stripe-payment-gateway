// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   await app.listen(process.env.PORT ?? 3000);
// }
// bootstrap();


// // // import { NestFactory } from '@nestjs/core';
// // // import { AppModule } from './app.module';
// // // import { json, urlencoded } from 'express';
// // // import { IncomingMessage } from 'http';

// // // declare module "http" {
// // //   interface IncomingMessage {
// // //     rawBody?: Buffer;
// // //   }
// // // }

// // // const PORT = process.env.PORT || 3000;

// // // async function bootstrap() {
// // //   const app = await NestFactory.create(AppModule);

// // //   // Middleware: Preserve raw body for Stripe webhooks
// // //   app.use(
// // //     json({
// // //       verify: (req: IncomingMessage, res, buf) => {
// // //         if (req.headers['stripe-signature']) {
// // //           req.rawBody = buf; // Preserve raw body for Stripe webhooks
// // //         }
// // //       },
// // //     })
// // //   );
// // //   app.use(urlencoded({ extended: true }));

// // //   await app.listen(PORT);
// // //   console.log(`🚀 Server running on port ${PORT}`);
// // // }

// // // bootstrap();


// // import { NestFactory } from '@nestjs/core';
// // import { AppModule } from './app.module';
// // import { json, urlencoded } from 'express';
// // import { IncomingMessage } from 'http';

// // declare module "http" {
// //   interface IncomingMessage {
// //     rawBody?: Buffer;
// //   }
// // }

// // const PORT = process.env.PORT || 3000;

// // async function bootstrap() {
// //   const app = await NestFactory.create(AppModule);


// //    // Enable CORS
// //    app.enableCors({
// //     origin: [
// //       'http://localhost:5173',
// //       'https://stripe-investor-frontend-git-main-rustys-projects-10a06046.vercel.app'  // Allow deployed frontend
// //     ],
// //     methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
// //     allowedHeaders: 'Content-Type, Authorization',
// //     credentials: true,
// //   });

// //   // Middleware: Preserve raw body for Stripe webhooks
// //   app.use(
// //     json({
// //       verify: (req: IncomingMessage, res, buf) => {
// //         if (req.headers['stripe-signature']) {
// //           req.rawBody = buf; // Preserve raw body for Stripe webhooks
// //         }
// //       },
// //     })
// //   );
// //   app.use(urlencoded({ extended: true }));

// //   await app.listen(PORT);
// //   console.log(`🚀 Server running on port ${PORT}`);
// // }

// // bootstrap();




// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { json, urlencoded } from 'express';
// import { IncomingMessage } from 'http';

// declare module "http" {
//   interface IncomingMessage {
//     rawBody?: Buffer;
//   }
// }

// const PORT = process.env.PORT || 3000;

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);

//   // ✅ Ensure CORS headers are set properly
//   // app.enableCors({
//   //   origin: '*',
//   //   methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//   //   allowedHeaders: ['Content-Type', 'Authorization'],
//   //   credentials: true,
//   // });

//   app.enableCors({
//     origin: [
//       'http://localhost:5173',  // Local development
//       'https://stripe-investor-frontend-git-main-rustys-projects-10a06046.vercel.app',  // Deployed frontend
//     ],
//     methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization'],
//     credentials: true,
//   });

//   // Middleware: Preserve raw body for Stripe webhooks
//   app.use(
//     json({
//       verify: (req: IncomingMessage, res, buf) => {
//         if (req.headers['stripe-signature']) {
//           req.rawBody = buf; // Preserve raw body for Stripe webhooks
//         }
//       },
//     })
//   );
//   app.use(urlencoded({ extended: true }));

//   await app.listen(PORT);
//   console.log(`🚀 Server running on port ${PORT}`);
// }

// bootstrap();



import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { IncomingMessage } from 'http';

declare module "http" {
  interface IncomingMessage {
    rawBody?: Buffer;
  }
}

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Manually set CORS headers
  // app.use((req, res, next) => {
  //   res.header("Access-Control-Allow-Origin", "https://stripe-investor-frontend.vercel.app");
  //   res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  //   res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  //   res.header("Access-Control-Allow-Credentials", "true");

  //   // ✅ Handle Preflight Requests
  //   if (req.method === "OPTIONS") {
  //     return res.sendStatus(204);
  //   }

  //   next();
  // });

  app.enableCors({
    origin: [
      'http://localhost:5173',  // Local development
      'https://stripe-investor-frontend.vercel.app',  // Production frontend
      /^https:\/\/stripe-investor-frontend-.*-rustys-projects-.*\.vercel\.app$/,  // Preview deployments
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ✅ Preserve raw body for Stripe webhooks
  app.use(
    json({
      verify: (req: IncomingMessage, res, buf) => {
        if (req.headers['stripe-signature']) {
          req.rawBody = buf;
        }
      },
    })
  );

  app.use(urlencoded({ extended: true }));

  await app.listen(PORT);
  console.log(`🚀 Server running on port ${PORT}`);
}

bootstrap();
