# Story and clue progression verification

The authoritative incident order is collision at 03:17, the driver answering and cutting off the guard at 03:20, then parking at 03:26. He stays in the driver's seat for nine seconds, hears the passenger ask him to open the door, locks it, and only then gets out alone. The fatal passenger ending is unchanged.

The office's incomplete CCTV now leaves those nine seconds unexplained. The annex explicitly holds only the guard's microphone channel. The archive contains the complete call and parking record, so its revelation adds the missing refusal instead of contradicting earlier evidence. The office no longer promises a ghost-delivered drainage key. Archive directions identify the northeast editing room, and the records no longer falsely claim their correct timestamps are scrambled.

The courtyard safe accepts input after its instructions are read. The log and emergency-phone notice are the two code clues; the playground fragment is optional and remains collectible after unlocking. Older search saves with both useful clues can also enter or confirm the code.

Three regression cases failed before the progression fix: advancement with the two useful clues, entering a known code without the optional fragment, and unlocking an older search checkpoint after load/retry. All 34 affected story, expansion-story, save/settings and overhaul tests pass afterward. TypeScript checking also passes. The full story route still reaches the fatal ending; the legacy parking drainage route is retained for existing saves. Human-facing prose was reviewed for event order rather than tested with exact-word assertions.

These checks establish story-state progression. Physical navigation, timing under pursuit, rendered clues and the matching `game.ts` dialogue are verified separately by the main quality pass.
