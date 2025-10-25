import { useState, useEffect } from "react";
import { MessageSquare, Search, Filter, Clock, Star, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { API_BASE_URL } from "@/config/api";

interface Message {
  message_id: number;
  sender_id: number;
  sender_name: string;
  sender_role: string;
  sender_staff_id?: string;
  sender_departments?: string;
  subject: string;
  content: string;
  priority: "normal" | "urgent";
  status: "unread" | "read";
  created_at: string;
  read_at?: string;
}

const Messages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [filteredMessages, setFilteredMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMarkedRead, setHasMarkedRead] = useState(false);
  const { toast } = useToast();

  // Fetch messages on component mount
  useEffect(() => {
    fetchMessages();
    fetchUnreadCount();

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchMessages();
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Mark all as read when component mounts (Messages tab opened)
  useEffect(() => {
    if (!hasMarkedRead && messages.length > 0) {
      const hasUnread = messages.some(m => m.status === 'unread');
      if (hasUnread) {
        markAllAsRead();
        setHasMarkedRead(true);
      }
    }
  }, [messages, hasMarkedRead]);

  // Filter messages when search or priority filter changes
  useEffect(() => {
    filterMessages();
  }, [searchQuery, filterPriority, messages]);

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setMessages(data.data);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/messages/unread-count`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('📬 Marking all messages as read...');
      const token = localStorage.getItem('staffToken');
  const response = await fetch(`${API_BASE_URL}/api/messages/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        console.log(`✅ Marked ${data.count} message(s) as read`);
        setUnreadCount(0);
        // Update messages status locally
        setMessages(prev => prev.map(m => ({ ...m, status: 'read' as const })));

        if (data.count > 0) {
          toast({
            title: "Messages Marked as Read",
            description: `${data.count} message(s) marked as read`,
          });
        }
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };

  const filterMessages = () => {
    let filtered = messages;

    // Filter by priority
    if (filterPriority !== "all") {
      filtered = filtered.filter(m => m.priority === filterPriority);
    }

    // Search by sender name or subject
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.sender_name?.toLowerCase().includes(query) ||
        m.subject?.toLowerCase().includes(query)
      );
    }

    setFilteredMessages(filtered);
  };

  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    setIsViewDialogOpen(true);
  };

  const getTimeAgo = (dateString: string) => {
    // Parse the database timestamp (which is in Zimbabwe time / UTC)
    const date = new Date(dateString);

    // Get current time
    const now = new Date();

    // Calculate difference in milliseconds
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Handle edge case: if timestamp is in the future due to timezone issues
    if (diffMs < 0) {
      return 'Just now';
    }

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">Messages</h1>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground">Loading messages...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <MessageSquare className="w-8 h-8 text-primary" />
            Messages
          </h1>
          <p className="text-muted-foreground">
            Communications from doctors and staff
          </p>
        </div>
        <Badge variant="secondary" className="text-base px-4 py-2">
          {unreadCount} Unread
        </Badge>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-3 items-center flex-col sm:flex-row">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by doctor name or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="urgent">Urgent Only</SelectItem>
                <SelectItem value="normal">Normal Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Messages Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredMessages.map((message) => (
          <Card
            key={message.message_id}
            className={`cursor-pointer transition-smooth hover:shadow-lg ${
              message.status === 'unread' ? "border-primary border-2" : ""
            }`}
            onClick={() => handleViewMessage(message)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(message.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {message.sender_name}
                      </CardTitle>
                      {message.status === 'unread' && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {message.sender_departments || message.sender_role}
                    </p>
                  </div>
                </div>
                {message.priority === "urgent" && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Urgent
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold text-foreground mb-2">
                {message.subject}
              </h4>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {message.content}
              </p>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="w-3 h-3 mr-1" />
                {getTimeAgo(message.created_at)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredMessages.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || filterPriority !== 'all'
                ? 'No messages found matching your filters'
                : 'No messages yet'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* View Message Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Message Details</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsViewDialogOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-6">
              {/* Sender Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(selectedMessage.sender_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedMessage.sender_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedMessage.sender_departments || selectedMessage.sender_role}
                    </p>
                    {selectedMessage.sender_staff_id && (
                      <p className="text-xs text-muted-foreground">
                        ID: {selectedMessage.sender_staff_id}
                      </p>
                    )}
                  </div>
                </div>
                {selectedMessage.priority === "urgent" && (
                  <Badge variant="destructive" className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    Urgent
                  </Badge>
                )}
              </div>

              {/* Message Content */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Subject</p>
                  <h4 className="font-semibold text-lg">{selectedMessage.subject}</h4>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Message</p>
                  <p className="text-sm whitespace-pre-wrap">{selectedMessage.content}</p>
                </div>
              </div>

              {/* Metadata */}
              <div className="border-t pt-4 space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>Received: {new Date(selectedMessage.created_at).toLocaleString()}</span>
                </div>
                {selectedMessage.read_at && (
                  <div className="flex items-center gap-2">
                    <span>Read: {new Date(selectedMessage.read_at).toLocaleString()}</span>
                  </div>
                )}
                <div>
                  <Badge variant={selectedMessage.status === 'unread' ? 'default' : 'secondary'}>
                    {selectedMessage.status === 'unread' ? 'Unread' : 'Read'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;
