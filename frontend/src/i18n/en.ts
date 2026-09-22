/**
 * The reference dictionary. Its shape is the `Messages` type every other locale must
 * satisfy, so a key missing from another locale fails the build. Call sites are not
 * checked — vue-i18n's t() takes any string, and an unknown key renders as itself.
 */
export const en = {
  nav: {
    admin: "Admin",
    logOut: "Log out",
  },
  auth: {
    userName: "User name",
    password: "Password",
    logIn: "Log in",
    logInTitle: "Log in",
    createAccount: "Create account",
    createAccountTitle: "Create an account",
    noAccountYet: "No account yet?",
    createOne: "Create one",
    alreadyRegistered: "Already have an account?",
    signedIn: "Authentication successful !",
    signedUp: "Registration successful !",
  },
  draw: {
    titlePlaceholder: "Enter a title",
    titleLabel: "Drawing title",
    rename: "Rename drawing, currently {title}",
    play: "Play Sound",
    stop: "Stop",
    loading: "Loading your drawing…",
    strokes: "no stroke | {count} stroke | {count} strokes",
    points: "no point | {count} point | {count} points",
    savedAt: "saved {date}",
    neverSaved: "not saved yet",
    saved: "Drawing saved successfully !",
  },
  tool: {
    colour: "Colour",
    width: "Width",
    widthLabel: "Stroke width",
    widthAndEraser: "Stroke width and eraser",
    eraser: "Eraser",
    eraserHint: "Eraser — removes whole strokes",
    undo: "Undo",
    clear: "Clear",
    save: "Save",
  },
  palette: {
    ink: "Ink",
    red: "Red",
    yellow: "Yellow",
    green: "Green",
    violet: "Violet",
  },
  width: {
    thin: "Thin",
    medium: "Medium",
    thick: "Thick",
  },
  admin: {
    title: "Drawings",
    loading: "Loading drawings…",
    empty: "Nobody has saved a drawing yet.",
    close: "Close",
    cancel: "Cancel",
    delete: "Delete",
    confirmTitle: "Delete this drawing?",
    confirmBody: "“{title}” by {user} will be removed for good. This cannot be undone.",
    deleted: "“{title}” by {user} was deleted successfully.",
    playCard: "Play {what}",
    stopCard: "Stop {what}",
    deleteCard: "Delete {what}",
    by: "{title} by {user}",
  },
  notFound: {
    title: "Page not found",
    toDrawings: "Back to the drawings",
    toCanvas: "Back to the canvas",
  },
  toast: {
    dismiss: "Dismiss notification",
  },
  error: {
    invalidCredentials: "Incorrect user name or password.",
    userNameTaken: "This user name is already taken.",
    unreachable: "Cannot reach the server. Please try again.",
    unknown: "Something went wrong.",
  },
};

export type Messages = typeof en;

