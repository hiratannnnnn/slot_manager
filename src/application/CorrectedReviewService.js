class CorrectedReviewService {
  constructor({ fortyTwoApiClient }) {
    this.fortyTwoApiClient = fortyTwoApiClient;
  }

  async listUpcomingReviews() {
    const scaleTeams = [];
    const pageSize = 100;

    for (let pageNumber = 1; ; pageNumber += 1) {
      const page = await this.fortyTwoApiClient.listMyScaleTeamsAsCorrected({
        futureOnly: true,
        pageSize,
        pageNumber,
      });
      scaleTeams.push(...page);

      if (page.length < pageSize) {
        break;
      }
    }

    return scaleTeams.map(formatCorrectedReview);
  }
}

function formatCorrectedReview(scaleTeam) {
  return {
    id: scaleTeam.id,
    beginAt: scaleTeam.begin_at,
    correctorLogin: scaleTeam.corrector?.login || null,
    projectName: getProjectName(scaleTeam),
  };
}

function getProjectName(scaleTeam) {
  return scaleTeam.team?.project?.name
    || scaleTeam.project?.name
    || scaleTeam.scale?.evaluation?.project?.name
    || null;
}

module.exports = {
  CorrectedReviewService,
  formatCorrectedReview,
};
