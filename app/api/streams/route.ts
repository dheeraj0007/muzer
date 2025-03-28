import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prismaClient } from "@/app/lib/db";
import { YT_REGEX } from "@/lib/utils";
import { getServerSession } from "next-auth";
const youtubesearchapi = require("youtube-search-api");

const CreateStreamSchema = z.object({
  creatorId: z.string(),
  url: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const data = CreateStreamSchema.parse(await req.json());
    const isYt = data.url.match(YT_REGEX);
    if (!isYt) {
      return NextResponse.json(
        {
          message: "Wrong Url format",
        },
        {
          status: 411,
        }
      );
    }
    const extractedId = data.url.split("?v=")[1];
    const res = await youtubesearchapi.GetVideoDetails(extractedId);
    console.log(res.title);
    const thumbnails = res.thumbnail.thumbnails;
    thumbnails.sort((a: { width: number }, b: { width: number }) =>
      a.width < b.width ? -1 : 1
    );
    const stream = await prismaClient.stream.create({
      data: {
        userId: data.creatorId,
        url: data.url,
        extractedId,
        type: "Youtube",
        title: res.title ?? "Cant find video",
        smallImg:
          (thumbnails.length > 1
            ? thumbnails[thumbnails.length - 2].url
            : thumbnails[thumbnails.length - 1].url) ??
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQnEVK4zeR69PqDHLELmGk8vIhtI_i1JVfDnzLAPBLbeFVS2WnLsXsB-YRVGCh1_LUNfXU&usqp=CAU",
        bigImg: thumbnails[thumbnails.length - 1].url ?? "",
      },
    });
    return NextResponse.json({
      ...stream,
      hasUpvoted: false,
      upvotes: 0,
    });
  } catch (e: any) {
    console.log(e.message);
    return NextResponse.json(
      {
        message: "Error while adding a stream",
      },
      {
        status: 411,
      }
    );
  }
}

export async function GET(req: NextRequest) {
  const session = await getServerSession();
  const user = await prismaClient.user.findFirst({
    where: {
      email: session?.user?.email ?? "",
    },
  });
  if (!user) {
    return NextResponse.json(
      {
        message: "Unauthorized",
      },
      {
        status: 403,
      }
    );
  }
  const creatorId = req.nextUrl.searchParams.get("creatorId");
  if (!creatorId) {
    return NextResponse.json(
      {
        message: "Error",
      },
      {
        status: 403,
      }
    );
  }
  const [streams, activeStream] = await Promise.all([
    await prismaClient.stream.findMany({
      where: {
        userId: creatorId,
        played: false,
      },
      include: {
        _count: {
          select: {
            upvotes: true,
          },
        },
        upvotes: {
          where: {
            userId: user.id,
          },
        },
      },
    }),
    prismaClient.currentStream.findFirst({
      where: {
        userId: creatorId,
      },
      include: { stream: true },
    }),
  ]);
  return NextResponse.json({
    streams: streams
      .map(({ _count, ...rest }) => ({
        ...rest,
        upvotes: _count.upvotes,
        haveUpvoted: rest.upvotes.length ? true : false,
      }))
      .sort((a, b) => b.upvotes - a.upvotes),
    activeStream,
  });
}
