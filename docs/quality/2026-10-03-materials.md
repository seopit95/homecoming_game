# Surface material source and verification

The apartment/building plaster and structural concrete now use separate photographic color, OpenGL normal and packed ambient-occlusion/roughness/metal maps. Only the color maps use sRGB decoding. The ordinary walls retain the authored paint tint; the roughness map controls the flashlight response rather than treating color variation as surface height.

Sources: [Painted Plaster Wall by Amal Kumar](https://polyhaven.com/a/painted_plaster_wall) and [Concrete Floor 02](https://polyhaven.com/a/concrete_floor_02). Poly Haven publishes these assets under [CC0](https://polyhaven.com/license). Six original 1K JPEG maps total 3,213,629 bytes. Download URLs, upstream MD5 checksums and byte sizes are recorded in `public/textures/pbr/sources.json`; checksums were verified during download.

The assets are bundled with the game; players do not depend on the source site being available. Geometry, prop support, other materials, lighting, animation and full-campaign visual review remain separate quality gates. This material change does not by itself establish photorealism or release readiness.
