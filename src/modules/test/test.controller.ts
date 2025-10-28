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
      userId: req.user?.id,
    };
  }
}
