import { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import prisma from "../config/database";

const router = Router();

/**
 * CREATE TASK + ASSIGN TO USERS
 * Body:
 * {
 *   "title": string,
 *   "description": string | null,
 *   "dueDate": string | null,
 *   "userIds": [1, 2, 3]  // optional
 * }
 */
router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { title, description, dueDate, userIds = [] } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const task = await prisma.task.create({
      data: {
        title,
        description,
        dueDate: dueDate ? new Date(dueDate) : null,
        userTasks: {
          create: userIds.map((id: number) => ({ userId: id })),
        },
      },
      include: {
        userTasks: { include: { user: true } }
      }
    });

    console.log("\nTASK POST IN USE: ", task);

    res.json(task);
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({ error: "Failed to create task" });
  }
});



/**
 * ASSIGN USER TO EXISTING TASK
 * POST /tasks/:taskId/assign
 * Body: { "userId": number }
 */
router.post("/:taskId/assign", authenticateToken, async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const { userId } = req.body;

    if (!userId) return res.status(400).json({ error: "userId is required" });

    const assignment = await prisma.userTask.create({
      data: {
        taskId: Number(taskId),
        userId: Number(userId)
      }
    });

    res.json(assignment);
  } catch (error: any) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "User already assigned to task" });
    }
    console.error("Error assigning task:", error);
    res.status(500).json({ error: "Failed to assign user to task" });
  }
});



/**
 * GET ALL TASKS
 * GET /tasks
 */
router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        userTasks: {
          include: { user: true }
        }
      }
    });

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});



/**
 * GET TASKS FOR SPECIFIC USER
 * GET /tasks/user/:userId
 */
router.get("/user/:userId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

    const tasks = await prisma.userTask.findMany({
      where: { userId: Number(userId) },
      include: {
        task: {
          include: {
            userTasks: { include: { user: true } }
          }
        }
      }
    });

    const cleaned = tasks.map(t => t.task);
    res.json(cleaned);
  } catch (error) {
    console.error("Error fetching user tasks:", error);
    res.status(500).json({ error: "Failed to fetch user tasks" });
  }
});



/**
 * REMOVE USER FROM TASK
 * DELETE /tasks/:taskId/user/:userId
 */
router.delete("/:taskId/user/:userId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;
    const userId = req.params.userId as string;

    await prisma.userTask.delete({
      where: {
        userId_taskId: {
          userId: Number(userId),
          taskId: Number(taskId)
        }
      }
    });

    res.json({ message: "User removed from task" });
  } catch (error) {
    console.error("Error removing user from task:", error);
    res.status(500).json({ error: "Failed to remove user from task" });
  }
});



/**
 * DELETE TASK
 * DELETE /tasks/:taskId
 */
router.delete("/:taskId", authenticateToken, async (req: Request, res: Response) => {
  try {
    const taskId = req.params.taskId as string;

    // Delete userTask relations first (due to FK constraints)
    await prisma.userTask.deleteMany({
      where: { taskId: Number(taskId) }
    });

    await prisma.task.delete({
      where: { id: Number(taskId) }
    });

    res.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ error: "Failed to delete task" });
  }
});

export default router;
