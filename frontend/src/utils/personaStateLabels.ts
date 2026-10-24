// Plain-language labels for internal simulator persona states.
// These describe the demonstration simulator only; they are not sensor identities.
const PERSONA_STATE_LABELS: Record<string, string> = {
  autonomous_moving: 'Moving on route',
  performing_action: 'Performing action',
  collapsed: 'Collapsed',
  calling_help: 'Calling for help',
  recovering: 'Recovering',
};

export function formatPersonaState(state: string): string {
  return PERSONA_STATE_LABELS[state] ?? state.replace(/_/g, ' ');
}
