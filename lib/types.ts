export type FriendAnswer = {
  question: string;
  answer: string;
};

export type Friend = {
  id: string;
  name: string;
  location: string;
  lat: number;
  lng: number;
  photos: string[];
  answers: FriendAnswer[];
};

export type FriendsResponse = {
  friends: Friend[];
  formUrl: string | null;
  source: "google-sheet" | "sample";
};
