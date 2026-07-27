import { Ionicons } from "@expo/vector-icons";
import { useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Theme } from "../../constants/theme";

const QUICK_ACTIONS = [
    {
        id: "plan",
        label: "Plan my day",
        icon: "calendar-outline",
        prompt: "Help me plan my day.",
    },
    {
        id: "priority",
        label: "Prioritize tasks",
        icon: "flag-outline",
        prompt: "Which tasks should I prioritize?",
    },
    {
        id: "summary",
        label: "Today's summary",
        icon: "list-outline",
        prompt: "Give me a summary of my tasks today.",
    },
    {
        id: "tips",
        label: "Productivity tips",
        icon: "bulb-outline",
        prompt: "Give me a productivity tip.",
    },
];

const INITIAL_MESSAGES = [
    {
        id: "welcome-message",
        role: "assistant",
        text:
            "Hi! I'm TaskPilot AI. I can help organize your tasks, plan your day, and recommend what to work on first.",
    },
];

const SAMPLE_RESPONSES = {
    "Help me plan my day.":
        "Let's create a simple plan. Start with your highest-priority task, complete one shorter task afterward, and leave flexible time for unexpected work.",

    "Which tasks should I prioritize?":
        "I'll prioritize tasks based on urgency, due date, and importance. Once we connect your saved tasks, I can provide personalized recommendations.",

    "Give me a summary of my tasks today.":
        "Your task data will appear here after we connect TaskPilot AI to Firestore. I'll summarize due tasks, completed work, and upcoming deadlines.",

    "Give me a productivity tip.":
        "Try working on one important task for 25 minutes without switching apps. Afterward, take a short break before continuing.",
};

const createMessageId = () => {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
};

export default function AssistantScreen() {
    const listRef = useRef(null);

    const [messages, setMessages] =
        useState(INITIAL_MESSAGES);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const scrollToBottom = () => {
        setTimeout(() => {
            listRef.current?.scrollToEnd({
                animated: true,
            });
        }, 100);
    };

    const generateTemporaryResponse = (message) => {
        return (
            SAMPLE_RESPONSES[message] ||
            "I received your message. My Gemini connection will be added next, so I will soon be able to provide a smarter and more personalized answer."
        );
    };

    const sendMessage = async (customMessage) => {
        const cleanMessage = (
            customMessage ?? input
        ).trim();

        if (!cleanMessage || isTyping) {
            return;
        }

        const userMessage = {
            id: createMessageId(),
            role: "user",
            text: cleanMessage,
        };

        setMessages((currentMessages) => [
            ...currentMessages,
            userMessage,
        ]);

        setInput("");
        setIsTyping(true);
        scrollToBottom();

        await new Promise((resolve) => {
            setTimeout(resolve, 900);
        });

        const assistantMessage = {
            id: createMessageId(),
            role: "assistant",
            text: generateTemporaryResponse(cleanMessage),
        };

        setMessages((currentMessages) => [
            ...currentMessages,
            assistantMessage,
        ]);

        setIsTyping(false);
        scrollToBottom();
    };

    const resetConversation = () => {
        setMessages(INITIAL_MESSAGES);
        setInput("");
        setIsTyping(false);
    };

    const renderMessage = ({ item }) => {
        const isUser = item.role === "user";

        return (
            <View
                style={[
                    styles.messageRow,
                    isUser
                        ? styles.userMessageRow
                        : styles.assistantMessageRow,
                ]}
            >
                {!isUser && (
                    <View style={styles.avatar}>
                        <Ionicons
                            name="sparkles"
                            size={17}
                            color="#FFFFFF"
                        />
                    </View>
                )}

                <View
                    style={[
                        styles.messageBubble,
                        isUser
                            ? styles.userBubble
                            : styles.assistantBubble,
                    ]}
                >
                    {!isUser && (
                        <Text style={styles.assistantName}>
                            TaskPilot AI
                        </Text>
                    )}

                    <Text
                        style={[
                            styles.messageText,
                            isUser
                                ? styles.userMessageText
                                : styles.assistantMessageText,
                        ]}
                    >
                        {item.text}
                    </Text>
                </View>
            </View>
        );
    };

    const renderTypingIndicator = () => {
        if (!isTyping) {
            return <View style={styles.footerSpacing} />;
        }

        return (
            <View style={styles.typingRow}>
                <View style={styles.avatar}>
                    <Ionicons
                        name="sparkles"
                        size={17}
                        color="#FFFFFF"
                    />
                </View>

                <View style={styles.typingBubble}>
                    <ActivityIndicator
                        size="small"
                        color={Theme.colors.primary}
                    />

                    <Text style={styles.typingText}>
                        TaskPilot AI is thinking...
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView
            style={styles.safeArea}
            edges={["top"]}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={
                    Platform.OS === "ios"
                        ? "padding"
                        : "height"
                }
                keyboardVerticalOffset={
                    Platform.OS === "ios" ? 82 : 0
                }
            >
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Ionicons
                            name="sparkles"
                            size={23}
                            color="#FFFFFF"
                        />
                    </View>

                    <View style={styles.headerTextContainer}>
                        <Text style={styles.headerTitle}>
                            TaskPilot AI
                        </Text>

                        <View style={styles.statusRow}>
                            <View style={styles.statusDot} />

                            <Text style={styles.headerSubtitle}>
                                Your productivity assistant
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.refreshButton}
                        activeOpacity={0.75}
                        onPress={resetConversation}
                    >
                        <Ionicons
                            name="refresh-outline"
                            size={22}
                            color={Theme.colors.text}
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.fixedTools}>
                    <Text style={styles.welcomeTitle}>
                        How can I help today?
                    </Text>

                    <Text style={styles.welcomeDescription}>
                        Ask about your schedule, priorities, or
                        daily productivity.
                    </Text>

                    <FlatList
                        data={QUICK_ACTIONS}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={
                            styles.quickActionsContainer
                        }
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.quickActionButton,
                                    isTyping &&
                                        styles.quickActionDisabled,
                                ]}
                                activeOpacity={0.75}
                                disabled={isTyping}
                                onPress={() =>
                                    sendMessage(item.prompt)
                                }
                            >
                                <Ionicons
                                    name={item.icon}
                                    size={17}
                                    color={
                                        Theme.colors.primary
                                    }
                                />

                                <Text
                                    style={
                                        styles.quickActionText
                                    }
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>

                <FlatList
                    ref={listRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={(item) => item.id}
                    style={styles.messageList}
                    contentContainerStyle={
                        styles.messageContent
                    }
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    onContentSizeChange={scrollToBottom}
                    ListFooterComponent={
                        renderTypingIndicator
                    }
                />

                <View style={styles.inputSection}>
                    <View style={styles.inputContainer}>
                        <TouchableOpacity
                            style={styles.voiceButton}
                            activeOpacity={0.75}
                        >
                            <Ionicons
                                name="mic-outline"
                                size={22}
                                color={Theme.colors.primary}
                            />
                        </TouchableOpacity>

                        <TextInput
                            value={input}
                            onChangeText={setInput}
                            placeholder="Ask TaskPilot AI..."
                            placeholderTextColor={
                                Theme.colors.secondaryText
                            }
                            style={styles.input}
                            multiline
                            maxLength={500}
                            returnKeyType="send"
                            blurOnSubmit={false}
                            onSubmitEditing={() =>
                                sendMessage()
                            }
                        />

                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                (!input.trim() ||
                                    isTyping) &&
                                    styles.sendButtonDisabled,
                            ]}
                            activeOpacity={0.8}
                            disabled={
                                !input.trim() || isTyping
                            }
                            onPress={() => sendMessage()}
                        >
                            <Ionicons
                                name="arrow-up"
                                size={21}
                                color="#FFFFFF"
                            />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.disclaimer}>
                        TaskPilot AI may make mistakes. Review
                        important task details.
                    </Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },

    container: {
        flex: 1,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingTop: 10,
        paddingBottom: 13,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        backgroundColor: Theme.colors.background,
    },

    headerIcon: {
        width: 44,
        height: 44,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 11,
        borderRadius: 15,
        backgroundColor: Theme.colors.primary,
    },

    headerTextContainer: {
        flex: 1,
    },

    headerTitle: {
        fontSize: 19,
        fontWeight: "800",
        color: Theme.colors.text,
    },

    statusRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 3,
    },

    statusDot: {
        width: 7,
        height: 7,
        marginRight: 6,
        borderRadius: 4,
        backgroundColor: "#22C55E",
    },

    headerSubtitle: {
        fontSize: 12,
        color: Theme.colors.secondaryText,
    },

    refreshButton: {
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 14,
        backgroundColor: Theme.colors.surface,
    },

    fixedTools: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: Theme.colors.border,
        backgroundColor: Theme.colors.background,
    },

    welcomeTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: Theme.colors.text,
    },

    welcomeDescription: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 19,
        color: Theme.colors.secondaryText,
    },

    quickActionsContainer: {
        gap: 9,
        paddingTop: 12,
        paddingRight: 10,
    },

    quickActionButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 7,
        paddingHorizontal: 13,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 14,
        backgroundColor: Theme.colors.surface,
    },

    quickActionDisabled: {
        opacity: 0.55,
    },

    quickActionText: {
        fontSize: 13,
        fontWeight: "700",
        color: Theme.colors.text,
    },

    messageList: {
        flex: 1,
    },

    messageContent: {
        flexGrow: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 8,
    },

    messageRow: {
        width: "100%",
        marginBottom: 15,
    },

    userMessageRow: {
        alignItems: "flex-end",
    },

    assistantMessageRow: {
        flexDirection: "row",
        alignItems: "flex-start",
    },

    avatar: {
        width: 34,
        height: 34,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 8,
        borderRadius: 12,
        backgroundColor: Theme.colors.primary,
    },

    messageBubble: {
        maxWidth: "82%",
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderRadius: 17,
    },

    userBubble: {
        borderBottomRightRadius: 5,
        backgroundColor: Theme.colors.primary,
    },

    assistantBubble: {
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderTopLeftRadius: 5,
        backgroundColor: Theme.colors.surface,
    },

    assistantName: {
        marginBottom: 4,
        fontSize: 11,
        fontWeight: "800",
        color: Theme.colors.primary,
    },

    messageText: {
        fontSize: 14,
        lineHeight: 21,
    },

    userMessageText: {
        color: "#FFFFFF",
    },

    assistantMessageText: {
        color: Theme.colors.text,
    },

    typingRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },

    typingBubble: {
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 16,
        backgroundColor: Theme.colors.surface,
    },

    typingText: {
        fontSize: 13,
        color: Theme.colors.secondaryText,
    },

    footerSpacing: {
        height: 14,
    },

    inputSection: {
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: Platform.OS === "ios" ? 5 : 11,
        borderTopWidth: 1,
        borderTopColor: Theme.colors.border,
        backgroundColor: Theme.colors.surface,
    },

    inputContainer: {
        minHeight: 54,
        flexDirection: "row",
        alignItems: "flex-end",
        padding: 6,
        borderWidth: 1,
        borderColor: Theme.colors.border,
        borderRadius: 18,
        backgroundColor: Theme.colors.background,
    },

    voiceButton: {
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
    },

    input: {
        flex: 1,
        minHeight: 42,
        maxHeight: 110,
        paddingHorizontal: 8,
        paddingTop: Platform.OS === "ios" ? 11 : 8,
        paddingBottom: 8,
        fontSize: 15,
        color: Theme.colors.text,
    },

    sendButton: {
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 14,
        backgroundColor: Theme.colors.primary,
    },

    sendButtonDisabled: {
        opacity: 0.4,
    },

    disclaimer: {
        marginTop: 7,
        textAlign: "center",
        fontSize: 10,
        color: Theme.colors.secondaryText,
    },
});