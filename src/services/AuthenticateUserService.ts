import axios from "axios";
import prismaClient from "../prisma";
import { sign } from "jsonwebtoken";

interface IAccessTokenResponse {
  access_token: string;
}

interface IUserResponse {
  id: number;
  name: string;
  login: string;
  avatar_url: string;
  url: string;
  location: string;
  bio: string;
}

class AuthenticateUserService {
  async execute(code: string) {
    const url = "https://github.com/login/oauth/access_token";
    const { data: accessTokenResponse } =
      await axios.post<IAccessTokenResponse>(url, null, {
        params: {
          client_id: process.env.GITHUB_CLIENT_ID,
          client_secret: process.env.GITHUB_CLIENT_SECRET,
          code,
        },
        headers: {
          Accept: "application/json",
        },
      });

    const { data: userResponse } = await axios.get<IUserResponse>(
      "https://api.github.com/user",
      {
        headers: {
          authorization: `Bearer ${accessTokenResponse.access_token}`,
        },
      }
    );

    const {
      login,
      id,
      avatar_url,
      name,
      bio,
      location,
      url: userUrl,
    } = userResponse;
    const user = await prismaClient.user.findFirst({
      where: {
        github_id: id,
      },
    });

    if (!user) {
      let user = await prismaClient.user.create({
        data: {
          github_id: id,
          login,
          avatar_url,
          name,
          bio,
          location,
          url: userUrl,
        },
      });
    }

    const token = sign(
      {
        user: {
          name: user.name,
          avatar_url: user.avatar_url,
          id: user.id,
        },
      },
      process.env.JWT_SECRET,
      {
        subject: user.id,
        expiresIn: "1w",
      }
    );

    return { token, user };
  }
}

export { AuthenticateUserService };
