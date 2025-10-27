import { Controller, Get, Headers } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';

@ApiTags('Test')
@Controller('test')
export class TestController {

  @Get()
  @ApiHeader({
    name: 'x-user-id',
    description: 'User ID for rate limiting',
    required: false,
  })
  get(@Headers('x-user-id') userId: string) {
    return {
      ok: true,
      message: 'Request allowed',
      userId: userId || 'anonymous',
    };
  }
}
