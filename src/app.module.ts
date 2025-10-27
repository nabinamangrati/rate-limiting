import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from './redis.module';
import { TestModule } from './modules/test/test.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_DURATION },
    }),
    RedisModule,
    TestModule,

  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // You can apply middlewares here if needed
  }
}
