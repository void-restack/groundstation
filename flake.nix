{
  description = "GROUNDSTATION - mission control for a cloud fleet";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      version = "0.1.1";
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      packages.${system}.default = pkgs.stdenv.mkDerivation {
        pname = "groundstation";
        inherit version;

        src = pkgs.fetchurl {
          url = "https://github.com/void-restack/groundstation/releases/download/v${version}/gnd-linux-x64";
          hash = "sha256-3jXX+bNfsWjs4XrKvNKrnlo0KIizWw0yfMPis09WMDo=";
        };

        dontUnpack = true;
        nativeBuildInputs = [ pkgs.autoPatchelfHook ];
        buildInputs = [ pkgs.stdenv.cc.cc.lib ];
        installPhase = "install -Dm755 $src $out/bin/gnd";

        meta = {
          description = "Mission control for a cloud fleet";
          homepage = "https://github.com/void-restack/groundstation";
          license = pkgs.lib.licenses.mit;
          platforms = [ system ];
          mainProgram = "gnd";
        };
      };
    };
}
