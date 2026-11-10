import { userService } from "./user.service";

export async function listUsers(): Promise<Response> {
  const users = await userService.list();

  return Response.json({
    data: users,
  });
}

export async function getUser(request: Request): Promise<Response> {
  const id = new URL(request.url).pathname.split("/").pop();

  if (!id) {
    return Response.json(
      { error: "User ID is required" },
      { status: 400 },
    );
  }

  const user = await userService.getById(id);

  if (!user) {
    return Response.json(
      { error: "User not found" },
      { status: 404 },
    );
  }

  return Response.json({ data: user });
}
