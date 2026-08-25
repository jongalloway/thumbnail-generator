export function getCommunityStandupGuestCount(guests) {
    return guests.length === 0 ? 2 : Math.min(4, guests.length)
}