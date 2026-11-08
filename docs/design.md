# 귀가 · 03:17

The user approved the proposed solo immersive horror direction and requested a playable game to feel it. Build a complete short browser prototype in this project, with no further design approval needed.

Experience: a lived-in Korean apartment at night, rain outside, flickering practical lights and a handheld beam. First-person mouse/keyboard controls, touch fallback, and an in-world title screen. No external media or accounts inside the game. Use restrained procedural audio with a volume control. Brightness and camera sensitivity are adjustable; camera bob can be disabled.

Flow: read a phone in the living room → restore power in utility room → inspect unfamiliar wet shoes at entrance → investigate a bedroom radio → hide in the bedroom wardrobe from an approaching figure → wait for footsteps to stop → leave through the entrance. A caught player can retry from the radio checkpoint. Pausing must freeze danger and audio. Restart must reset the whole story. All visible game copy is Korean.

Stack: generated Sites/Vinext React project, Three.js WebGL scene, native Web Audio. Geometry and textures are native game rendering, not image-generation substitutes. No speculative accounts, inventory systems or asset pipeline.

Validation: Node assertions for state transitions, success and failure paths, hiding and checkpoint behavior; TypeScript; production build; non-browser HTTP preview check. Browser UI testing was not requested. Publish owner-only through Sites.

Validation notes: WebMCP is feature-detected and optional. No supported browser WebMCP validation context was used, and no browser visual or interaction QA was requested. State and level-reachability checks are automated.
