export type KpiScore = {
  category: string;
  rating: number;
  comment: string;
};

export type PerformanceReview = {
  id: string;
  staffId: string;
  staffName: string;
  department: string;
  reviewerId: string;
  reviewerName: string;
  period: string;
  periodLabel: string;
  kpiScores: KpiScore[];
  overallRating: number | null;
  strengths: string;
  improvements: string;
  comments: string;
  status: "draft" | "submitted" | "acknowledged";
  submittedAt: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
};

export type UpsertPerformanceReviewInput = {
  id?: string;
  staffId: string;
  staffName: string;
  department: string;
  reviewerId: string;
  reviewerName: string;
  period: string;
  periodLabel: string;
  kpiScores: KpiScore[];
  overallRating: number | null;
  strengths: string;
  improvements: string;
  comments: string;
  status: "draft" | "submitted";
};
