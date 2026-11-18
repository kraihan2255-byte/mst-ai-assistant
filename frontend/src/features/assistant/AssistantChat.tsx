import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { DeliveryPreviewCard } from './DeliveryPreviewCard';
import { CustomerSelectionCard } from './CustomerSelectionCard';
import { useToast } from '../../components/ui/toast';
import { aiApi } from '../../lib/api-client';
import { useConfirmDelivery } from '../../hooks/use-deliveries';
import { formatDateTime, formatRupees } from '../../lib/formatters';
import type { ChatMessage } from './types';
import type { DeliveryDraft, MatchedCustomerSummary, PaymentMethod } from '../../types/api';

const EXAMPLE_PROMPTS = [
  'I delivered 10 boxes to ABC Catering for 5000 rupees and received 2000 through GPay.',
  'Delivered 5 boxes to Modern Bakers for 3000 rupees in cash.',
  'Delivered 8 boxes to Kerala Supermarket for 4000 rupees, no payment yet.',
  'Who owes me money?',
];

export function AssistantChat() {
  const toast = useToast();
  const confirmDeliveryMutation = useConfirmDelivery();

  const [inputMessage, setInputMessage] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I am your MST Tengapal business assistant. Speak or type your deliveries and payments in plain English. For example:\n\n"I delivered 10 boxes to ABC Catering for 5000 rupees and received 2000 through GPay."',
      timestamp: new Date(),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isParsing]);

  // Handle sending a message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isParsing) return;

    setInputMessage('');

    // Append user message
    const userMsgId = `user-${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMsgId,
      role: 'user',
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsParsing(true);

    try {
      const draft: DeliveryDraft = await aiApi.parseCommand(text);

      if (draft.action === 'record_delivery') {
        const assistantMsgId = `assistant-${Date.now()}`;

        // Check if customer is ambiguous
        if (
          draft.requires_customer_selection &&
          draft.candidate_customers &&
          draft.candidate_customers.length > 1
        ) {
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: 'assistant',
              text: `I found ${draft.candidate_customers?.length} matching customers for "${draft.recipient_name}". Which one did you deliver to?`,
              timestamp: new Date(),
              draft,
              requiresSelection: true,
              candidates: draft.candidate_customers,
            },
          ]);
        } else if (draft.missing_fields && draft.missing_fields.length > 0) {
          // Missing required fields
          const fieldNames = draft.missing_fields.join(', ');
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: 'assistant',
              text: `I noted your delivery draft, but some information is missing: ${fieldNames}. Please provide the missing details.`,
              timestamp: new Date(),
              draft,
            },
          ]);
        } else {
          // Ready to preview and confirm
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: 'assistant',
              text: `I've prepared a draft for your delivery to "${draft.recipient_name}". Please review and confirm before saving:`,
              timestamp: new Date(),
              draft,
            },
          ]);
        }
      } else {
        // Query or non-delivery request
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            text: `I recognized your query: "${text}". You can track your outstanding customers in the Reports tab, or ask me to record a delivery with customer, boxes, amount, and payment details!`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to parse command.';
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          text: `I could not process that request: ${errMsg}`,
          timestamp: new Date(),
          error: errMsg,
        },
      ]);
      toast.error(errMsg, 'AI Assistant Error');
    } finally {
      setIsParsing(false);
    }
  };

  // Handle selecting an ambiguous customer candidate
  const handleSelectCustomer = (
    messageId: string,
    customer: MatchedCustomerSummary,
  ) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.draft) {
          const updatedDraft: DeliveryDraft = {
            ...msg.draft,
            recipient_name: customer.name,
            matched_customer: customer,
            requires_customer_selection: false,
          };
          return {
            ...msg,
            requiresSelection: false,
            draft: updatedDraft,
            text: `Customer selected: "${customer.name}". Please review and confirm your delivery:`,
          };
        }
        return msg;
      }),
    );
  };

  // Handle explicit delivery confirmation
  const handleConfirmDelivery = async (
    messageId: string,
    finalData: {
      customerId: string;
      outerBoxes: number | null;
      totalAmountRupees: number;
      payments: Array<{
        amountRupees: number;
        method: PaymentMethod;
        provider?: string | null;
      }>;
      notes?: string;
    },
  ) => {
    try {
      const idempotencyKey = `ai-chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const saved = await confirmDeliveryMutation.mutateAsync({
        customerId: finalData.customerId,
        outerBoxes: finalData.outerBoxes,
        totalAmountRupees: finalData.totalAmountRupees,
        payments: finalData.payments,
        notes: finalData.notes,
        idempotencyKey,
        confirmed: true,
      });

      toast.success(
        `Delivery to ${saved.customerName} recorded successfully!`,
        'Confirmed & Persisted',
      );

      // Update message state
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId) {
            return {
              ...msg,
              isConfirmed: true,
              delivery: saved,
              text: `✅ Delivery successfully confirmed and saved to database!`,
            };
          }
          return msg;
        }),
      );

      // Append confirmation reply
      const confirmReply: ChatMessage = {
        id: `confirm-reply-${Date.now()}`,
        role: 'assistant',
        text: `Delivery #${saved.id.slice(0, 8)} to ${saved.customerName} for ${formatRupees(saved.totalAmountRupees)} has been recorded.\n• Paid: ${formatRupees(saved.totalPaidRupees)}\n• Outstanding Balance: ${formatRupees(saved.outstandingRupees)}\n• Status: ${saved.paymentStatus}`,
        timestamp: new Date(),
        delivery: saved,
      };

      setMessages((prev) => [...prev, confirmReply]);
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to confirm delivery.';
      toast.error(errMsg, 'Confirmation Error');
    }
  };

  const handleCancelDraft = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId) {
          return {
            ...msg,
            draft: undefined,
            requiresSelection: false,
            text: 'Delivery draft cancelled.',
          };
        }
        return msg;
      }),
    );
  };

  const clearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: 'assistant',
        text: 'Chat cleared. How can I help you today? Speak or type your deliveries and payments.',
        timestamp: new Date(),
      },
    ]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-4xl mx-auto rounded-2xl border border-stone-200 bg-white shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-stone-100 bg-stone-50/50">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-brand-primary text-white flex items-center justify-center shadow-sm">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-brand-dark">
                MST Tengapal AI Assistant
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
                <Sparkles className="h-2.5 w-2.5" /> Qwen3 4B Local
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Natural-language command extraction & verified persistence
            </p>
          </div>
        </div>

        <Button
          onClick={clearChat}
          variant="ghost"
          size="sm"
          className="text-stone-400 hover:text-stone-600"
          title="Clear chat history"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-stone-50/30">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-stone-200 text-stone-700'
                    : 'bg-brand-primary text-white shadow-sm'
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Bubble & Content */}
              <div
                className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%] ${
                  isUser ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    isUser
                      ? 'bg-brand-primary text-white rounded-tr-none'
                      : 'bg-white border border-stone-200 text-brand-dark rounded-tl-none shadow-sm whitespace-pre-wrap'
                  }`}
                >
                  {msg.text}
                </div>

                {/* Candidate Customer Selector Card */}
                {!isUser &&
                  msg.requiresSelection &&
                  msg.candidates &&
                  msg.candidates.length > 0 && (
                    <CustomerSelectionCard
                      candidates={msg.candidates}
                      onSelect={(c) => handleSelectCustomer(msg.id, c)}
                      onCancel={() => handleCancelDraft(msg.id)}
                    />
                  )}

                {/* Delivery Confirmation Preview Card */}
                {!isUser && msg.draft && !msg.isConfirmed && !msg.requiresSelection && (
                  <DeliveryPreviewCard
                    draft={msg.draft}
                    isLoading={confirmDeliveryMutation.isPending}
                    onConfirm={(finalData) =>
                      handleConfirmDelivery(msg.id, finalData)
                    }
                    onCancel={() => handleCancelDraft(msg.id)}
                  />
                )}

                <span className="text-[10px] text-stone-400 px-1">
                  {formatDateTime(msg.timestamp)}
                </span>
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isParsing && (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-brand-primary text-white flex items-center justify-center shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center gap-2 text-xs text-stone-500 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-brand-primary animate-ping" />
              <span>Analyzing command with Qwen3...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-2 border-t border-stone-100 bg-white flex items-center gap-2 overflow-x-auto text-xs">
        <span className="text-stone-400 font-medium shrink-0 flex items-center gap-1">
          <HelpCircle className="h-3 w-3" /> Try:
        </span>
        {EXAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(prompt)}
            disabled={isParsing}
            className="shrink-0 px-2.5 py-1 rounded-full bg-stone-100 hover:bg-brand-accent/60 text-stone-700 hover:text-brand-dark transition-colors font-medium border border-stone-200/50"
          >
            "{prompt.length > 40 ? `${prompt.slice(0, 40)}...` : prompt}"
          </button>
        ))}
      </div>

      {/* Textarea Input Form */}
      <div className="p-3 sm:p-4 border-t border-stone-200 bg-white">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-2"
        >
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              rows={2}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Record a delivery or payment (e.g. 'Delivered 10 boxes to ABC Catering for 5000, received 2000 GPay')..."
              className="w-full rounded-xl border border-stone-300 bg-stone-50/50 px-3.5 py-2.5 text-sm text-brand-dark placeholder:text-stone-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary resize-none transition-colors"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!inputMessage.trim() || isParsing}
            className="h-11 px-4 rounded-xl shadow-sm"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
        <p className="text-[10px] text-stone-400 mt-1.5 text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-stone-100 border">Enter</kbd> to send, <kbd className="px-1 py-0.5 rounded bg-stone-100 border">Shift + Enter</kbd> for new line. AI never saves without confirmation.
        </p>
      </div>
    </div>
  );
}
