import { PreviewMessage, AwaitingResponseMessage } from './message';
import { memo, useEffect, useMemo } from 'react';
import equal from 'fast-deep-equal';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useMessages } from '@/hooks/use-messages';
import type { ChatMessage, FeedbackMap } from '@chat-template/core';
import { useDataStream } from './data-stream-provider';
import { Conversation, ConversationContent } from './elements/conversation';
import { ArrowDownIcon } from 'lucide-react';

interface MessagesProps {
  status: UseChatHelpers<ChatMessage>['status'];
  messages: ChatMessage[];
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  addToolApprovalResponse: UseChatHelpers<ChatMessage>['addToolApprovalResponse'];
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  selectedModelId: string;
  feedback?: FeedbackMap;
}

function PureMessages({
  status,
  messages,
  setMessages,
  addToolApprovalResponse,
  sendMessage,
  regenerate,
  isReadonly,
  selectedModelId,
  feedback = {},
}: MessagesProps) {
  const {
    containerRef: messagesContainerRef,
    endRef: messagesEndRef,
    isAtBottom,
    scrollToBottom,
    hasSentMessage,
  } = useMessages({
    status,
  });

  const { dataStream } = useDataStream();

  // Extract inline images from streaming data parts (e.g. injected
  // `<img src="data:...">` fragments written by the server UI writer).
  const streamImages = useMemo(() => {
    if (!dataStream || dataStream.length === 0) return [] as string[];
    const imgRegex = /<img\s+[^>]*src=(?:"|')(.*?)(?:"|')[^>]*>/gi;
    const imgs: string[] = [];
    for (const part of dataStream) {
      if (part.type === 'text' && typeof (part as any).text === 'string') {
        const text = (part as any).text as string;
        let m: RegExpExecArray | null;
        while ((m = imgRegex.exec(text))) {
          if (m[1]) imgs.push(m[1]);
        }
      }
    }
    return imgs;
  }, [dataStream]);

  useEffect(() => {
    if (status === 'submitted') {
      requestAnimationFrame(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth',
          });
        }
      });
    }
  }, [status, messagesContainerRef]);

  return (
    <div
      ref={messagesContainerRef}
      className="overscroll-behavior-contain -webkit-overflow-scrolling-touch flex-1 touch-pan-y overflow-y-scroll"
      style={{ overflowAnchor: 'none' }}
    >
      <Conversation className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 md:gap-6">
        <ConversationContent className="flex flex-col gap-4 px-4 py-4 md:gap-6">
          {messages.map((message, index) => (
            <PreviewMessage
              key={message.id}
              message={message}
              allMessages={messages}
              isLoading={
                status === 'streaming' && messages.length - 1 === index
              }
              setMessages={setMessages}
              addToolApprovalResponse={addToolApprovalResponse}
              sendMessage={sendMessage}
              regenerate={regenerate}
              isReadonly={isReadonly}
              requiresScrollPadding={
                hasSentMessage && index === messages.length - 1
              }
              initialFeedback={feedback[message.id]}
            />
          ))}

          {status === 'submitted' &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'user' &&
            selectedModelId !== 'chat-model-reasoning' && (
              <AwaitingResponseMessage />
            )}

          <div
            ref={messagesEndRef}
            className="min-h-[24px] min-w-[24px] shrink-0"
          />

          {/* Render any images emitted via the data stream while streaming */}
          {streamImages.length > 0 &&
            messages.length > 0 &&
            messages[messages.length - 1].role === 'assistant' && (
              <div className="mx-auto flex w-full max-w-4xl px-4 py-2">
                <div className="flex flex-col gap-2 w-full">
                  {streamImages.map((src, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={`stream-img-${i}`}
                      src={src}
                      alt={`stream-image-${i}`}
                      className="max-w-full rounded-md border bg-muted"
                    />
                  ))}
                </div>
              </div>
            )}
        </ConversationContent>
      </Conversation>

      {!isAtBottom && (
        <button
          className="-translate-x-1/2 absolute bottom-40 left-1/2 z-10 rounded-full border bg-background p-2 shadow-lg transition-colors hover:bg-muted"
          onClick={() => scrollToBottom('smooth')}
          type="button"
          aria-label="Scroll to bottom"
        >
          <ArrowDownIcon className="size-4" />
        </button>
      )}
    </div>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  // Always re-render during streaming to ensure incremental token display
  if (prevProps.status === 'streaming' || nextProps.status === 'streaming') {
    return false;
  }

  if (prevProps.selectedModelId !== nextProps.selectedModelId) return false;
  if (prevProps.messages.length !== nextProps.messages.length) return false;
  if (!equal(prevProps.messages, nextProps.messages)) return false;
  if (!equal(prevProps.feedback, nextProps.feedback)) return false;

  return true; // Props are equal, skip re-render
});
