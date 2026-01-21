import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from 'sonner';
import { MessageSquare, CheckCircle2, XCircle, Search, Reply, Filter, User, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HelpFeedback {
    id: string;
    user_id: string;
    profile_id: string | null;
    section_id: string;
    subsection_id: string | null;
    helpful: boolean;
    feedback_text: string | null;
    admin_reply: string | null;
    replied_at: string | null;
    replied_by: string | null;
    created_at: string;
    updated_at: string;
    user?: {
        first_name: string | null;
        username: string | null;
    };
}

export function FeedbackReports() {
    const [feedbacks, setFeedbacks] = useState<HelpFeedback[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterHelpful, setFilterHelpful] = useState<string>("all");
    const [replyingTo, setReplyingTo] = useState<HelpFeedback | null>(null);
    const [replyText, setReplyText] = useState("");
    const [isSubmittingReply, setIsSubmittingReply] = useState(false);

    useEffect(() => {
        fetchFeedbacks();
    }, [filterHelpful]);

    const fetchFeedbacks = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("help_feedback")
                .select(`
          *,
          user:profiles!help_feedback_profile_id_fkey(first_name, username)
        `)
                .order("created_at", { ascending: false });

            if (filterHelpful !== "all") {
                query = query.eq("helpful", filterHelpful === "yes");
            }

            const { data, error } = await query;
            if (error) throw error;
            setFeedbacks(data || []);
        } catch (error: any) {
            console.error("Error fetching feedbacks:", error);
            toast.error("Failed to load feedback");
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async () => {
        if (!replyingTo || !replyText.trim()) return;

        setIsSubmittingReply(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            const { error } = await supabase
                .from("help_feedback")
                .update({
                    admin_reply: replyText.trim(),
                    replied_at: new Date().toISOString(),
                    replied_by: user.id,
                })
                .eq("id", replyingTo.id);

            if (error) throw error;

            if (replyingTo.profile_id) {
                await supabase
                    .from("duel_notifications")
                    .insert({
                        user_id: replyingTo.profile_id,
                        type: "help_feedback_reply",
                        title: "Response to your feedback",
                        message: `Admin replied to your feedback on "${replyingTo.section_id}"`,
                        icon: "message-square",
                        metadata: {
                            feedback_id: replyingTo.id,
                            section_id: replyingTo.section_id,
                            subsection_id: replyingTo.subsection_id,
                            admin_reply: replyText.trim(),
                        },
                    });
            }

            toast.success("Reply sent successfully");
            setReplyingTo(null);
            setReplyText("");
            fetchFeedbacks();
        } catch (error: any) {
            toast.error(error.message || "Failed to send reply");
        } finally {
            setIsSubmittingReply(false);
        }
    };

    const filteredFeedbacks = feedbacks.filter((feedback) => {
        const matchesSearch =
            feedback.section_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            feedback.feedback_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            feedback.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
    });

    const stats = {
        total: feedbacks.length,
        helpful: feedbacks.filter((f) => f.helpful).length,
        notHelpful: feedbacks.filter((f) => !f.helpful).length,
        pending: feedbacks.filter((f) => !f.admin_reply).length,
    };

    return (
        <div className="space-y-6 animate-in fade-in-50 duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Feedback', count: stats.total, icon: MessageSquare, color: 'text-zinc-400', bg: 'bg-zinc-500/10' },
                    { label: 'Helpful', count: stats.helpful, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Not Helpful', count: stats.notHelpful, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
                    { label: 'Pending Reply', count: stats.pending, icon: Reply, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-xl border border-white/5 bg-zinc-900/30 backdrop-blur-sm flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-zinc-500">{stat.label}</p>
                            <p className={cn("text-2xl font-bold mt-1", stat.color)}>{stat.count}</p>
                        </div>
                        <div className={cn("p-2 rounded-lg", stat.bg)}>
                            <stat.icon className={cn("w-5 h-5", stat.color)} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 w-full max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Search feedback..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 bg-zinc-900/50 border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:ring-purple-500/20"
                    />
                </div>

                <Select value={filterHelpful} onValueChange={setFilterHelpful}>
                    <SelectTrigger className="w-[180px] bg-zinc-900/50 border-zinc-800 text-zinc-200">
                        <SelectValue placeholder="All Feedback" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                        <SelectItem value="all" className="text-zinc-300 focus:bg-zinc-800">All Feedback</SelectItem>
                        <SelectItem value="yes" className="text-zinc-300 focus:bg-zinc-800">Helpful Only</SelectItem>
                        <SelectItem value="no" className="text-zinc-300 focus:bg-zinc-800">Not Helpful Only</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-xl border border-white/5 bg-zinc-900/30 overflow-hidden backdrop-blur-sm">
                {loading ? (
                    <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-zinc-500" /></div>
                ) : filteredFeedbacks.length === 0 ? (
                    <div className="p-12 text-center text-zinc-500">No feedback found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-zinc-500 uppercase bg-zinc-900/50 border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Sentiment</th>
                                    <th className="px-6 py-3 font-medium">Context</th>
                                    <th className="px-6 py-3 font-medium">Comment</th>
                                    <th className="px-6 py-3 font-medium">User</th>
                                    <th className="px-6 py-3 font-medium text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredFeedbacks.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            {item.helpful ? (
                                                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 flex w-fit gap-1 items-center">
                                                    <CheckCircle2 className="w-3 h-3" /> Helpful
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-rose-500/10 text-rose-500 border-rose-500/20 flex w-fit gap-1 items-center">
                                                    <XCircle className="w-3 h-3" /> Issue
                                                </Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-zinc-300">
                                            <div className="font-medium text-xs text-zinc-500 uppercase tracking-wider mb-1">Section</div>
                                            {item.section_id}
                                            {item.subsection_id && <span className="text-zinc-600 ml-1">/ {item.subsection_id}</span>}
                                        </td>
                                        <td className="px-6 py-4 max-w-sm">
                                            {item.feedback_text ? (
                                                <p className="text-zinc-300 truncate">{item.feedback_text}</p>
                                            ) : (
                                                <span className="text-zinc-700 italic">No text provided</span>
                                            )}
                                            {item.admin_reply && (
                                                <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                                                    <Reply className="w-3 h-3" /> Replied
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-400">
                                                    {item.user?.first_name?.[0] || '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-zinc-300 font-medium text-xs">{item.user?.first_name || 'Anonymous'}</span>
                                                    <span className="text-zinc-600 text-[10px]">{new Date(item.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!item.admin_reply ? (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-zinc-400 hover:text-white"
                                                    onClick={() => {
                                                        setReplyingTo(item);
                                                        setReplyText("");
                                                    }}
                                                >
                                                    <Reply className="w-4 h-4 mr-2" /> Reply
                                                </Button>
                                            ) : (
                                                <Button size="sm" variant="ghost" disabled className="text-zinc-600 opacity-50">
                                                    Replied
                                                </Button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Dialog open={!!replyingTo} onOpenChange={(open) => !open && setReplyingTo(null)}>
                <DialogContent className="bg-[#09090b] border-zinc-800 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle>Reply to Feedback</DialogTitle>
                        <DialogDescription className="text-zinc-500">
                            User will receive a notification with your response.
                        </DialogDescription>
                    </DialogHeader>

                    {replyingTo && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 rounded-lg bg-zinc-900/50 border border-zinc-800">
                                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                                    <MessageSquare className="w-3 h-3" /> User Said
                                </div>
                                <p className="text-zinc-300 text-sm leading-relaxed">"{replyingTo.feedback_text || '(No text)'}"</p>
                                <div className="mt-2 text-xs text-zinc-600 flex gap-2">
                                    <span>Section: {replyingTo.section_id}</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-zinc-400">Your Response</Label>
                                <Textarea
                                    placeholder="Type your reply here..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    rows={4}
                                    className="bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:ring-purple-500/20 resize-none"
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setReplyingTo(null)} className="text-zinc-400 hover:text-white hover:bg-zinc-800">
                            Cancel
                        </Button>
                        <Button onClick={handleReply} disabled={!replyText.trim() || isSubmittingReply} className="bg-zinc-100 text-zinc-900 hover:bg-white">
                            {isSubmittingReply && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Send Reply
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
