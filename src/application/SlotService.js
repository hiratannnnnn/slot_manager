const DELETE_INTERVAL_MILLISECONDS = 750;

class SlotService {
  constructor({ fortyTwoApiClient }) {
    this.fortyTwoApiClient = fortyTwoApiClient;
  }

  async listMySlots() {
    const slots = await this.fortyTwoApiClient.listMySlots();

    return slots.map(formatSlot);
  }

  async createSlot({ beginAt, endAt }) {
    const me = await this.fortyTwoApiClient.getMe();
    const result = await this.fortyTwoApiClient.createSlot({
      userId: me.id,
      beginAt,
      endAt,
    });
    const slots = Array.isArray(result) ? result : [result];

    return slots.map(formatSlot);
  }

  async deleteSlot(slotId) {
    await this.fortyTwoApiClient.deleteSlot(slotId);
  }

  async deleteSlotsByRange({ beginAt, endAt }) {
    const slots = await this.listAllMySlotsForDeletion();
    const beginTime = new Date(beginAt).getTime();
    const endTime = new Date(endAt).getTime();
    const targetSlots = slots
      .map(formatSlot)
      .filter((slot) => {
        const slotBeginTime = new Date(slot.beginAt).getTime();
        const slotEndTime = new Date(slot.endAt).getTime();

        return slotBeginTime >= beginTime && slotEndTime <= endTime;
      })
      .sort((a, b) => new Date(a.beginAt) - new Date(b.beginAt));

    for (const [index, slot] of targetSlots.entries()) {
      if (index > 0) {
        await sleep(DELETE_INTERVAL_MILLISECONDS);
      }

      await this.fortyTwoApiClient.deleteSlot(slot.id);
    }

    return targetSlots;
  }

  async listAllMySlotsForDeletion() {
    const pageSize = 100;
    const slots = [];

    for (let pageNumber = 1; ; pageNumber += 1) {
      const page = await this.fortyTwoApiClient.listMySlots({ pageSize, pageNumber });
      slots.push(...page);

      if (page.length < pageSize) {
        return slots;
      }
    }
  }
}

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function formatSlot(slot) {
  return {
      id: slot.id,
      beginAt: slot.begin_at,
      endAt: slot.end_at,
      hasScaleTeam: Boolean(slot.scale_team),
      scaleTeam: slot.scale_team,
    };
}

module.exports = {
  SlotService,
};
