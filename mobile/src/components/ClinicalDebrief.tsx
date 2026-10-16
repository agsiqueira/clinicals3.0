import type { Dispatch, SetStateAction } from "react";
import { Pressable, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { DebriefSheet } from "./DebriefSheet";
import { ClinicalsChatComposer } from "./ClinicalsChatComposer";
import { debriefStyles } from "./debriefPresentation";
type Props = {
    debriefVisible: boolean;
    continueLearning: () => void;
    retryCase: () => void;
    debriefMentorSpeech: {
        isSpeaking: boolean;
        stop: () => Promise<unknown>;
    };
    voiceEnabled: boolean;
    setVoiceEnabled: Dispatch<SetStateAction<boolean>>;
    debriefInput: string;
    setDebriefInput: (value: string) => void;
    debriefSending: boolean;
    sendDebriefMessage: (text?: string) => unknown;
    conversationId: string | null;
    debriefTranscription: {
        toggleRecording: () => unknown;
        transcribing: boolean;
        recordingBusy: boolean;
        isRecording: boolean;
    };
    learnerDebriefMessage: string;
    debriefMessages: {
        role: string;
        content: string;
    }[];
    DEBRIEF_QUICK_ACTIONS: readonly string[];
    debriefError: string | null;
    visibleDebrief: {
        sessionScore: number;
    };
    reviewBadgeVisual: {
        style: StyleProp<ViewStyle>;
    };
    reviewBadgeLabel: string;
    reviewAchievementResults: unknown[];
    improvementObjectiveText: string;
    setOpenLearningDetail: Dispatch<SetStateAction<"score" | "patient" | "rubric" | null>>;
    openLearningDetail: "score" | "patient" | "rubric" | null;
    scoreDetailText: string;
    patientSummaryText: string;
    setShowDetailedRubric: Dispatch<SetStateAction<boolean>>;
    submissionResult: {
        earned_points?: number | null;
        available_points?: number | null;
    } | null;
    detailedRubricItems: {
        id: string;
        label?: string;
        status: string;
        section?: string;
        earned_points: number;
        points: number;
        rationale?: string | null;
        evidence?: string[];
        omit_reason?: string | null;
    }[];
    statusColor: (status: string) => string;
    statusLabel: (status: string) => string;
};
/** Presentation only: the encounter owner retains session state, requests and navigation. */
export function ClinicalDebrief({ debriefVisible, continueLearning, debriefMentorSpeech, voiceEnabled, setVoiceEnabled, debriefInput, setDebriefInput, debriefSending, sendDebriefMessage, conversationId, debriefTranscription, retryCase, learnerDebriefMessage, debriefMessages, DEBRIEF_QUICK_ACTIONS, debriefError, visibleDebrief, reviewBadgeVisual, reviewBadgeLabel, reviewAchievementResults, improvementObjectiveText, setOpenLearningDetail, openLearningDetail, scoreDetailText, patientSummaryText, setShowDetailedRubric, submissionResult, detailedRubricItems, statusColor, statusLabel }: Props) {
    return (<DebriefSheet visible={debriefVisible} onClose={continueLearning} speaking={debriefMentorSpeech.isSpeaking} voice={(<Pressable accessibilityRole="button" accessibilityState={{ selected: voiceEnabled }} onPress={() => {
                if (voiceEnabled) {
                    void debriefMentorSpeech.stop();
                }
                setVoiceEnabled((current) => !current);
            }} style={({ pressed }) => [
                debriefStyles.debriefVoiceToggle,
                { opacity: pressed ? 0.75 : 1 },
            ]}>
                          <Text style={debriefStyles.debriefVoiceToggleText}>
                            {voiceEnabled ? "Voice: On" : "Voice: Off"}
                          </Text>
                        </Pressable>)} composer={(<ClinicalsChatComposer preceptor value={debriefInput} onChangeText={setDebriefInput} editable={!debriefSending} placeholder="Ask Dr. Martinez about your progress..." submitLabel="Ask" onSubmit={() => sendDebriefMessage()} sendDisabled={debriefSending || !debriefInput.trim() || !conversationId} sending={debriefSending} onMicPress={debriefTranscription.toggleRecording} micDisabled={debriefSending ||
                debriefTranscription.transcribing ||
                debriefTranscription.recordingBusy} transcribing={debriefTranscription.transcribing} isRecording={debriefTranscription.isRecording}/>)} actions={(<View style={debriefStyles.debriefActions}>
                      <Pressable accessibilityRole="button" onPress={retryCase} style={debriefStyles.debriefSecondaryButton}>
                        <Text style={debriefStyles.debriefSecondaryButtonText}>Retry Encounter</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" onPress={continueLearning} style={debriefStyles.debriefPrimaryButton}>
                        <Text style={debriefStyles.debriefPrimaryButtonText}>Continue Learning</Text>
                      </Pressable>
                    </View>)}>
                    <View style={debriefStyles.debriefChatBox}>
                      <Text style={debriefStyles.debriefContextLabel}>Debrief</Text>
                      <View style={debriefStyles.debriefChatMessages}>
                        <View style={[
            debriefStyles.debriefChatBubble,
            debriefStyles.debriefChatBubbleAssistant,
        ]}>
                          <Text style={debriefStyles.debriefMentorLabel}>Dr. Martinez</Text>
                          <Text style={debriefStyles.debriefText}>{learnerDebriefMessage}</Text>
                        </View>

                        {debriefMessages.map((message, index) => (<View key={`${message.role}-${index}`} style={[
                debriefStyles.debriefChatBubble,
                message.role === "user"
                    ? debriefStyles.debriefChatBubbleUser
                    : debriefStyles.debriefChatBubbleAssistant,
            ]}>
                            <Text style={debriefStyles.debriefMentorLabel}>
                              {message.role === "user" ? "You" : "Dr. Martinez"}
                            </Text>
                            <Text style={debriefStyles.debriefText}>{message.content}</Text>
                          </View>))}
                      </View>

                      <Text style={debriefStyles.debriefChatHint}>
                        Choose a question or ask your own.
                      </Text>
                      <View style={debriefStyles.debriefQuickActions}>
                        {DEBRIEF_QUICK_ACTIONS.map((action) => (<Pressable accessibilityRole="button" key={action} onPress={() => sendDebriefMessage(action)} disabled={debriefSending || !conversationId} style={({ pressed }) => [
                debriefStyles.debriefQuickActionButton,
                {
                    opacity: debriefSending || !conversationId ? 0.45 : pressed ? 0.75 : 1,
                },
            ]}>
                            <Text style={debriefStyles.debriefQuickActionText}>{action}</Text>
                          </Pressable>))}
                      </View>

                      {debriefSending ? (<Text style={debriefStyles.debriefChatHint}>Dr. Martinez is responding...</Text>) : null}
                      {debriefError ? <Text style={debriefStyles.errorText}>{debriefError}</Text> : null}

                    </View>

                    <View style={debriefStyles.debriefReportPanel}>
                    <View style={debriefStyles.debriefReportDivider}>
                      <View style={debriefStyles.debriefReportLine}/>
                      <Text style={debriefStyles.debriefReportHeading}>Your Progress</Text>
                      <View style={debriefStyles.debriefReportLine}/>
                    </View>


                      <View style={debriefStyles.debriefScoreRow}>
                        <View style={debriefStyles.debriefMetricBoxCompact}>
                          <Text style={debriefStyles.debriefMetricLabel}>Session Score</Text>
                          <Text style={debriefStyles.debriefMetricValue}>{visibleDebrief.sessionScore}%</Text>
                        </View>
                        <View style={debriefStyles.debriefMetricBoxCompact}>
                          <Text style={debriefStyles.debriefMetricLabel}>Badge Earned</Text>
                          <View style={[debriefStyles.resultsBadgeInline, reviewBadgeVisual.style]}>
                            <Text style={debriefStyles.resultsBadgeInlineText}>{reviewBadgeLabel}</Text>
                          </View>
                        </View>
                      </View>

                      {reviewAchievementResults.length > 0 ? (<View style={debriefStyles.reviewSummaryCardCompact}>
                          <View style={debriefStyles.reviewSummaryRow}>
                            <Text style={debriefStyles.reviewSummaryLabel}>Focus next</Text>
                            <Text style={debriefStyles.reviewSummaryValue}>{improvementObjectiveText}</Text>
                          </View>
                        </View>) : null}

                      <View style={debriefStyles.learningDetailsCard}>
                        <Text style={debriefStyles.reviewSummaryTitle}>Learning Details</Text>

                        <Pressable accessibilityRole="button" accessibilityState={{ expanded: openLearningDetail === "score" }} onPress={() => setOpenLearningDetail((current) => (current === "score" ? null : "score"))} style={debriefStyles.learningDetailsToggle}>
                          <Text style={debriefStyles.learningDetailsTitle}>Why did I receive this score?</Text>
                          <Text style={debriefStyles.learningDetailsChevron}>
                            {openLearningDetail === "score" ? "Hide" : "Show"}
                          </Text>
                        </Pressable>
                        {openLearningDetail === "score" ? (<Text style={debriefStyles.learningDetailsText}>{scoreDetailText}</Text>) : null}

                        <View style={debriefStyles.reviewSummaryDivider}/>

                        <Pressable accessibilityRole="button" accessibilityState={{ expanded: openLearningDetail === "patient" }} onPress={() => setOpenLearningDetail((current) => (current === "patient" ? null : "patient"))} style={debriefStyles.learningDetailsToggle}>
                          <Text style={debriefStyles.learningDetailsTitle}>Patient Summary / HPI</Text>
                          <Text style={debriefStyles.learningDetailsChevron}>
                            {openLearningDetail === "patient" ? "Hide" : "Show"}
                          </Text>
                        </Pressable>
                        {openLearningDetail === "patient" ? (<Text style={debriefStyles.learningDetailsText}>{patientSummaryText}</Text>) : null}

                        <View style={debriefStyles.reviewSummaryDivider}/>

                        <Pressable accessibilityRole="button" accessibilityState={{ expanded: openLearningDetail === "rubric" }} onPress={() => {
            setShowDetailedRubric((current) => !current);
            setOpenLearningDetail((current) => (current === "rubric" ? null : "rubric"));
        }} style={debriefStyles.learningDetailsToggle}>
                          <Text style={debriefStyles.learningDetailsTitle}>Show Detailed Rubric</Text>
                          <Text style={debriefStyles.learningDetailsChevron}>
                            {openLearningDetail === "rubric" ? "Hide" : "Show"}
                          </Text>
                        </Pressable>
                        {openLearningDetail === "rubric" ? (<View style={debriefStyles.learningDetailsRubricList}>
                            {submissionResult?.earned_points != null ? (<Text style={debriefStyles.learningDetailsText}>
                                Rubric points: {submissionResult.earned_points} / {submissionResult.available_points}
                              </Text>) : null}
                            {detailedRubricItems.length > 0 ? (detailedRubricItems.map((item) => (<View key={item.id} style={debriefStyles.learningDetailsRubricItem}>
                                  <View style={debriefStyles.criterionRow}>
                                    <Text style={debriefStyles.criterionLabel}>{item.label || item.id}</Text>
                                    <Text style={[debriefStyles.criterionStatusText, { color: statusColor(item.status) }]}>
                                      {statusLabel(item.status)}
                                    </Text>
                                  </View>
                                  <Text style={debriefStyles.criterionMeta}>
                                    {item.section} · {item.earned_points}/{item.points}
                                  </Text>
                                  {!!item.rationale && (<Text style={debriefStyles.criterionRationale}>{item.rationale}</Text>)}
                                  {Array.isArray(item.evidence) && item.evidence.length > 0 && (<Text style={debriefStyles.criterionEvidence}>
                                      Evidence: {item.evidence.slice(0, 2).join(" | ")}
                                    </Text>)}
                                  {!!item.omit_reason && (<Text style={debriefStyles.criterionOmitReason}>Reason: {item.omit_reason}</Text>)}
                                </View>))) : (<Text style={debriefStyles.learningDetailsText}>
                                No detailed rubric items were stored for this attempt.
                              </Text>)}
                          </View>) : null}
                      </View>
                    </View>

        </DebriefSheet>);
}
