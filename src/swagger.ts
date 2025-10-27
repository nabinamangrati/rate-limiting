import { Logger } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder, OpenAPIObject } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const port = process.env.PORT;
  const logger = new Logger('swagger setup');
  const options = new DocumentBuilder()
    .setTitle('RUMSAN AI 1.0 API PROVIDER')
    .setDescription('RUMSAN AI ADMIN PANEL')
    .setVersion('1.0.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'access_token',
        in: 'header',
        description: 'JWT access token (Bearer)',
      },
      'access_token',
    )
    .addSecurityRequirements({ access_token: [] })
    .build();
  const document: OpenAPIObject = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('/api/rate-limiting', app, document);
  logger.log(
    `Swagger Documentation running on the url http://localhost:${port}/api/rate-limiting`,
  );
}
