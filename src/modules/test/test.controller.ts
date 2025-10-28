import { Controller, Get, Headers, Req } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

@ApiTags('Test')
@Controller('test')
export class TestController {

  @Get()

  get( @Req() req) {
    return {
      ok: true,
      message: 'Request allowed',
      userEmail: req.user?.email, 
    };
  }

  @Get('rate-limit-status')
getRateLimitStatus(@Req() req) {
  const user = req.user; // your user info
  const rateLimit = (req as any).rateLimit; // rate limit info
  return { user, rateLimit };
}
}
