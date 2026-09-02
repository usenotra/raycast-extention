import { getPreferenceValues } from "@raycast/api";
import type {
  ApiPost,
  BrandIdentityGenerationJob,
  GenerationEvent,
  GenerationJob,
  GetBrandIdentityResponse,
  GetPostResponse,
  GitHubIntegration,
  Organization,
  Post,
  PostDetails,
} from "../types";
import type {
  CreateGeoScanResponse,
  GeoAgentReadinessResponse,
  GeoCompetitorShareResponse,
  GeoCompetitorsResponse,
  GeoContentBriefResponse,
  GeoContentBriefsResponse,
  GeoContentGapsResponse,
  GeoDashboardData,
  GeoIngestSetupResponse,
  GeoLanguageShareResponse,
  GeoPromptsResponse,
  GeoPromptResultsResponse,
  GeoSequencesResponse,
  GeoSettingsResponse,
  GeoTrafficJourneysResponse,
  GeoTrafficJourneyResponse,
  GeoTrafficLogResponse,
  GeoTrafficOverviewResponse,
  GeoTrafficPagesResponse,
  GeoVisibilityOverviewResponse,
  GeoVisibilityTimeseriesResponse,
} from "../types/geo";
import { clearNotraCache, getPostCacheKey, setCachedValue } from "../utils";

const NOTRA_API_URL = "https://api.usenotra.com";

interface UpdatePostRequest {
  markdown: string;
  slug?: string | null;
  status: Post["status"];
  title: string;
}

interface DeletePostResponse {
  id: string;
  organization: Organization;
}

interface GeneratePostRequest {
  brandIdentityId: string;
  contentType: string;
  dataPoints?: {
    includePullRequests?: boolean;
    includeCommits?: boolean;
    includeReleases?: boolean;
    includeLinearData?: boolean;
  };
  integrations?: {
    github?: string[];
    linear?: string[];
  };
  lookbackWindow?: string;
}

interface GeneratePostResponse {
  job: GenerationJob;
  organization: Organization;
}

interface PostGenerationStatusResponse {
  events: GenerationEvent[];
  job: GenerationJob;
}

interface UpdateBrandIdentityRequest {
  audience?: string | null;
  companyDescription?: string | null;
  companyName?: string | null;
  customInstructions?: string | null;
  customTone?: string | null;
  isDefault?: boolean;
  language?: string | null;
  name?: string;
  toneProfile?: string | null;
  websiteUrl?: string;
}

interface DeleteBrandIdentityResponse {
  id: string;
  organization: Organization;
}

interface GenerateBrandIdentityRequest {
  name?: string;
  websiteUrl: string;
}

interface GenerateBrandIdentityResponse {
  job: BrandIdentityGenerationJob;
  organization: Organization;
}

interface BrandIdentityGenerationStatusResponse {
  job: BrandIdentityGenerationJob;
  organization: Organization;
}

interface CreateGitHubIntegrationRequest {
  branch?: string;
  owner: string;
  repo: string;
  token?: string;
}

interface CreateGitHubIntegrationResponse {
  github: GitHubIntegration;
  organization: Organization;
}

interface NotraRequestInit extends Omit<RequestInit, "headers"> {
  headers?: Record<string, string>;
}

export { NOTRA_API_URL };

export function getNotraRequestInit(init?: NotraRequestInit): RequestInit {
  const { apiKey } = getPreferenceValues<Preferences>();

  return {
    ...init,
    headers: {
      ...init?.headers,
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  };
}

export function mapPost(post: ApiPost): Post {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    content: post.content,
    markdown: post.markdown,
    recommendations: post.recommendations,
    contentType: post.contentType,
    sourceMetadata: post.sourceMetadata,
    status: post.status === "published" ? "published" : "draft",
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export function mapPostDetails(response: GetPostResponse): PostDetails {
  return {
    organization: response.organization,
    post: response.post ? mapPost(response.post) : null,
  };
}

export async function notraRequest<T>(path: string, init?: NotraRequestInit): Promise<T> {
  const response = await fetch(`${NOTRA_API_URL}${path}`, getNotraRequestInit(init));

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;

    const body = await response.json().catch(() => null);
    if (body && typeof body === "object" && "error" in body && typeof body.error === "string") {
      message = body.error;
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function getGeoDashboard(projectId: string, days: number): Promise<GeoDashboardData> {
  const projectPath = `/v1/projects/${encodeURIComponent(projectId)}/geo`;
  const window = `days=${days}`;
  const results = await Promise.allSettled([
    notraRequest<GeoSettingsResponse>(`${projectPath}/settings`),
    notraRequest<GeoVisibilityOverviewResponse>(`${projectPath}/visibility/overview?${window}`),
    notraRequest<GeoVisibilityTimeseriesResponse>(`${projectPath}/visibility/timeseries?${window}`),
    notraRequest<GeoCompetitorShareResponse>(`${projectPath}/visibility/competitor-share?${window}`),
    notraRequest<GeoLanguageShareResponse>(`${projectPath}/visibility/language-share?${window}`),
    notraRequest<GeoPromptResultsResponse>(`${projectPath}/visibility/prompt-results?${window}`),
    notraRequest<GeoTrafficOverviewResponse>(`${projectPath}/traffic/overview?${window}`),
    notraRequest<GeoPromptsResponse>(`${projectPath}/prompts`),
    notraRequest<GeoSequencesResponse>(`${projectPath}/sequences`),
    notraRequest<GeoCompetitorsResponse>(`${projectPath}/competitors`),
    notraRequest<GeoContentGapsResponse>(`${projectPath}/gaps`),
    notraRequest<GeoContentBriefsResponse>(`${projectPath}/briefs`),
    notraRequest<GeoAgentReadinessResponse>(`${projectPath}/agent-readiness`),
    notraRequest<GeoTrafficLogResponse>(`${projectPath}/traffic/log?limit=100`),
    notraRequest<GeoTrafficJourneysResponse>(`${projectPath}/traffic/journeys?${window}&limit=100`),
    notraRequest<GeoTrafficPagesResponse>(`${projectPath}/traffic/pages?${window}&limit=100`),
    notraRequest<GeoIngestSetupResponse>("/v1/geo/ingest/setup"),
  ] as const);
  const firstFulfilled = results.find((result) => result.status === "fulfilled");
  if (results.slice(0, 7).every((result) => result.status === "rejected")) {
    const reason = results[0].status === "rejected" ? results[0].reason : null;
    throw reason instanceof Error ? reason : new Error("Could not load GEO data");
  }

  const organization =
    firstFulfilled?.status === "fulfilled"
      ? firstFulfilled.value.organization
      : { id: "", logo: null, name: "", slug: "" };
  const errors: string[] = [];
  const valueOr = <T>(label: string, result: PromiseSettledResult<T>, fallback: T): T => {
    if (result.status === "fulfilled") {
      return result.value;
    }

    errors.push(`${label}: ${result.reason instanceof Error ? result.reason.message : "Request failed"}`);
    return fallback;
  };
  const [
    settingsResult,
    overviewResult,
    timeseriesResult,
    competitorShareResult,
    languageShareResult,
    promptResultsResult,
    trafficResult,
    promptsResult,
    sequencesResult,
    competitorsResult,
    gapsResult,
    briefsResult,
    readinessResult,
    trafficLogResult,
    trafficJourneysResult,
    trafficPagesResult,
    ingestSetupResult,
  ] = results;

  return {
    settings: valueOr("Settings", settingsResult, { configured: false, organization, settings: null }),
    overview: valueOr("Visibility", overviewResult, { configured: false, engines: [], organization }),
    timeseries: valueOr("Visibility trend", timeseriesResult, { configured: false, organization, points: [] }),
    competitorShare: valueOr("Share of voice", competitorShareResult, {
      configured: false,
      organization,
      points: [],
      timeseries: [],
    }),
    languageShare: valueOr("Languages", languageShareResult, { configured: false, organization, points: [] }),
    promptResults: valueOr("Prompt results", promptResultsResult, {
      configured: false,
      organization,
      results: [],
    }),
    traffic: valueOr("Traffic overview", trafficResult, {
      configured: false,
      organization,
      points: [],
      sources: [],
      totals: { aiReferral: 0, crawler: 0 },
    }),
    prompts: valueOr("Prompts", promptsResult, { configured: false, organization, prompts: [] }),
    sequences: valueOr("Sequences", sequencesResult, { organization, sequences: [] }),
    competitors: valueOr("Competitors", competitorsResult, { competitors: [], organization }),
    gaps: valueOr("Content gaps", gapsResult, { hasScanData: false, organization, promptGaps: [], searchGaps: [] }),
    briefs: valueOr("Content briefs", briefsResult, { briefs: [], organization }),
    readiness: valueOr("Agent readiness", readinessResult, null),
    trafficLog: valueOr("Traffic log", trafficLogResult, { configured: false, log: [], organization, total: 0 }),
    trafficJourneys: valueOr("Traffic journeys", trafficJourneysResult, {
      configured: false,
      journeys: [],
      organization,
    }),
    trafficPages: valueOr("Traffic pages", trafficPagesResult, { configured: false, organization, pages: [] }),
    ingestSetup: valueOr("Traffic setup", ingestSetupResult, null),
    errors,
  };
}

export function createGeoScan(projectId: string): Promise<CreateGeoScanResponse> {
  return notraRequest<CreateGeoScanResponse>(`/v1/projects/${encodeURIComponent(projectId)}/geo/scans`, {
    method: "POST",
  });
}

export function getGeoContentBrief(projectId: string, briefId: string): Promise<GeoContentBriefResponse> {
  return notraRequest<GeoContentBriefResponse>(
    `/v1/projects/${encodeURIComponent(projectId)}/geo/briefs/${encodeURIComponent(briefId)}`,
  );
}

export function getGeoTrafficJourney(
  projectId: string,
  journeyId: string,
  days: number,
): Promise<GeoTrafficJourneyResponse> {
  return notraRequest<GeoTrafficJourneyResponse>(
    `/v1/projects/${encodeURIComponent(projectId)}/geo/traffic/journeys/${encodeURIComponent(journeyId)}?days=${days}`,
  );
}

export async function updatePost(postId: string, input: UpdatePostRequest): Promise<PostDetails> {
  const response = await notraRequest<GetPostResponse>(`/v1/posts/${postId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const details = mapPostDetails(response);
  clearNotraCache();
  setCachedValue(getPostCacheKey(postId), details);
  return details;
}

export async function deletePost(postId: string): Promise<DeletePostResponse> {
  const response = await notraRequest<DeletePostResponse>(`/v1/posts/${postId}`, {
    method: "DELETE",
  });

  clearNotraCache();
  return response;
}

export function generatePost(input: GeneratePostRequest): Promise<GeneratePostResponse> {
  return notraRequest<GeneratePostResponse>("/v1/posts/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getPostGenerationStatus(jobId: string): Promise<PostGenerationStatusResponse> {
  return notraRequest<PostGenerationStatusResponse>(`/v1/posts/generate/${jobId}`);
}

export async function updateBrandIdentity(
  id: string,
  input: UpdateBrandIdentityRequest,
): Promise<GetBrandIdentityResponse> {
  const response = await notraRequest<GetBrandIdentityResponse>(`/v1/brand-identities/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  clearNotraCache();
  return response;
}

export async function deleteBrandIdentity(id: string): Promise<DeleteBrandIdentityResponse> {
  const response = await notraRequest<DeleteBrandIdentityResponse>(`/v1/brand-identities/${id}`, {
    method: "DELETE",
  });
  clearNotraCache();
  return response;
}

export function generateBrandIdentity(input: GenerateBrandIdentityRequest): Promise<GenerateBrandIdentityResponse> {
  return notraRequest<GenerateBrandIdentityResponse>("/v1/brand-identities/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
}

export function getBrandIdentityGenerationStatus(jobId: string): Promise<BrandIdentityGenerationStatusResponse> {
  return notraRequest<BrandIdentityGenerationStatusResponse>(`/v1/brand-identities/generate/${jobId}`);
}

export async function createGitHubIntegration(
  input: CreateGitHubIntegrationRequest,
): Promise<CreateGitHubIntegrationResponse> {
  const response = await notraRequest<CreateGitHubIntegrationResponse>("/v1/integrations/github", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  clearNotraCache();
  return response;
}
