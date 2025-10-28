import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class UserMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: any, res: any, next: () => void) {
    // Skip user check for auth and docs routes
    const url = req.url || req.raw?.url || '';
    if (
      url.startsWith('/api/rate-limiting')
    
    ) {
      return next();
    }
    const token = req.headers['access_token'] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('Missing access_token header');
    }
    try {
      const baseToken = token.replace('base64-', '');
      const tokenData = Buffer.from(baseToken, 'base64').toString('utf-8');
      const { access_token } = JSON.parse(tokenData) as {
        access_token: string;
      };
      const payload = this.jwtService.verify<{ sub: string; email: string }>(
        access_token,
        {
          secret: process.env.JWT_SECRET,
        },
      );
      // Query Supabase auth.users table using Prisma raw query
      const users = await this.prisma.$queryRaw<
        { id: string; email: string }[]
      >`SELECT id, email FROM auth.users WHERE email = ${payload.email} LIMIT 1`;
      const user = users[0];
      if (!user) throw new UnauthorizedException('User not found in Supabase');
      req.user = { id: user.id, email: user.email } as {
        id: string;
        email: string;
      };
      next();
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }
}