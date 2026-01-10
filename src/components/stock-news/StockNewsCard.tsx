import { memo, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Trash2, Clock, ArrowLeft, File } from "lucide-react";

export type StockNewsTab = "selected" | "saved" | "later";

type PriceData = { change: number; loading: boolean } | undefined;

export interface StockNewsCardProps {
  item: any;
  activeTab: StockNewsTab;
  isHighlighted: boolean;
  onClearHighlight: (postId: string) => void;

  symbol: string;
  priceData: PriceData;
  onRequestPrice: (symbol: string) => void;

  savedSentiment: string;
  onSave: (item: any, sentiment: "bullish" | "bearish") => void;

  onMoveToLater: (item: any) => void;
  onRemoveSaved: (postId: string) => void;
  onMoveBackToSaved: (item: any) => void;
  onRemoveLater: (postId: string) => void;

  onUpdateRemark: (postId: string, remark: string, tab: Exclude<StockNewsTab, "selected">) => void;

  dragHandleProps?: any;
}

function StockNewsCardBase({
  item,
  activeTab,
  isHighlighted,
  onClearHighlight,
  symbol,
  priceData,
  onRequestPrice,
  savedSentiment,
  onSave,
  onMoveToLater,
  onRemoveSaved,
  onMoveBackToSaved,
  onRemoveLater,
  onUpdateRemark,
  dragHandleProps,
}: StockNewsCardProps) {
  const cta = item.data?.cta?.[0];

  useEffect(() => {
    if (symbol) onRequestPrice(symbol);
  }, [symbol, onRequestPrice]);

  const publishedLabel = useMemo(() => {
    try {
      return format(new Date(item.publishedAt), "dd MMM yyyy hh:mma");
    } catch {
      return "";
    }
  }, [item.publishedAt]);

  const handleCardClick = () => {
    if (isHighlighted) onClearHighlight(item.postId);
  };

  return (
    <Card
      className={cn(
        "rounded-lg cursor-pointer transition-all",
        // Keep existing styling conventions from the page
        "bg-[#0d1117]",
        isHighlighted
          ? "border-2 border-yellow-500 shadow-lg shadow-yellow-500/20"
          : "border border-white/10"
      )}
      onClick={handleCardClick}
    >
      <CardContent className="p-3 flex flex-col h-full">
        {/* HEADER */}
        <div className="flex gap-2 mb-2">
          {cta?.logoUrl && (
            <img
              src={cta.logoUrl}
              alt={`${cta?.ctaText || "Stock"} logo`}
              className="w-8 h-8 rounded"
              loading="lazy"
              decoding="async"
            />
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <a
                href={cta?.ctaUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-semibold text-blue-400 hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {cta?.ctaText || item.data.title}
              </a>

              {priceData && !priceData.loading && priceData.change !== 0 && (
                <span
                  className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded",
                    priceData.change >= 0
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  )}
                >
                  {priceData.change >= 0 ? "+" : ""}
                  {priceData.change.toFixed(2)}%
                </span>
              )}

              {priceData?.loading && <span className="text-xs text-gray-500">...</span>}
            </div>

            <div className="text-xs text-gray-400">{publishedLabel}</div>
          </div>

          {activeTab === "saved" && (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <span title="Save for Later">
                <Clock
                  onClick={() => onMoveToLater(item)}
                  className="h-4 w-4 text-yellow-400 cursor-pointer hover:text-yellow-500"
                />
              </span>
              <Trash2
                onClick={() => onRemoveSaved(item.postId)}
                className="h-4 w-4 text-red-400 cursor-pointer hover:text-red-500"
              />
            </div>
          )}

          {activeTab === "later" && (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <span title="Move back to Saved">
                <ArrowLeft
                  onClick={() => onMoveBackToSaved(item)}
                  className="h-4 w-4 text-blue-400 cursor-pointer hover:text-blue-500"
                />
              </span>
              <Trash2
                onClick={() => onRemoveLater(item.postId)}
                className="h-4 w-4 text-red-400 cursor-pointer hover:text-red-500"
              />
            </div>
          )}
        </div>

        {/* BODY */}
        <p className="text-sm text-gray-300 whitespace-pre-line">{item.data.body}</p>

        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {item?.from && (
            <span className="mt-2 inline-block text-xs px-2 py-[2px] rounded bg-white/10 text-gray-300 w-fit">
              {item.from}
            </span>
          )}

          {item?.data?.media?.length ? (
            <a
              rel="noreferrer"
              href={`${item?.data?.media?.[0].url}`}
              target="_blank"
              onClick={(e) => e.stopPropagation()}
            >
              <File className="h-4 w-4 text-blue-400 cursor-pointer hover:text-blue-500" />
            </a>
          ) : null}
        </div>

        {/* REMARK - For Saved and Later tabs */}
        {(activeTab === "saved" || activeTab === "later") && (
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <Input
              placeholder="Add remark..."
              value={item.remark || ""}
              onChange={(e) => onUpdateRemark(item.postId, e.target.value, activeTab)}
              className="h-7 text-xs bg-white/5 border-white/10"
            />
          </div>
        )}

        {/* FOOTER */}
        <div
          {...dragHandleProps}
          className="mt-auto pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 cursor-grab active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              "text-xs px-2 py-[2px] rounded",
              item.__sentiment === "bullish" && "bg-green-500/20 text-green-400",
              item.__sentiment === "bearish" && "bg-red-500/20 text-red-400",
              item.__sentiment === "neutral" && "bg-yellow-500/20 text-yellow-400"
            )}
          >
            AI: {item.__sentiment} ({(Number(item.__confidence || 0) * 100).toFixed(0)}%)
          </span>

          <Select value={savedSentiment} onValueChange={(v) => onSave(item, v as any)}>
            <SelectTrigger
              className={cn(
                "h-7 w-24 text-xs",
                savedSentiment === "bullish" && "bg-green-500/20 text-green-400",
                savedSentiment === "bearish" && "bg-red-500/20 text-red-400"
              )}
            >
              <SelectValue placeholder="Save" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bullish">
                <TrendingUp className="h-3 w-3 mr-1 inline" />
                Bullish
              </SelectItem>
              <SelectItem value="bearish">
                <TrendingDown className="h-3 w-3 mr-1 inline" />
                Bearish
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}

const StockNewsCard = memo(StockNewsCardBase);
export default StockNewsCard;
