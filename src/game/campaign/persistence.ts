import { profileRepository } from "../persistence/repository";
export { applyResult, changeEquipment } from "./commands";
export const campaignRepository = {
  load: profileRepository.load,
  act: profileRepository.act,
  settle: profileRepository.settle,
  equip: (id: import("../loadout").RelicId | null) =>
    profileRepository.equipment("equip", id),
  enhance: (id: import("../loadout").RelicId) =>
    profileRepository.equipment("enhance", id),
};
export type CampaignRepository = typeof campaignRepository;
