module aya::aya {
    use sui::option;
    use sui::coin::{Self, TreasuryCap, CoinMetadata};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::url;

    /// The type identifier of AYA coin
    struct AYA has drop {}

    #[allow(unused_function)]
    /// Module initializer is called once on module publish
    fun init(witness: AYA, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,
            b"AYA",
            b"Aya Asagiri",
            b"Aya Asagiri - an Iconic Meme and Character from Magical Girl Site - Tears are Water, Manga is Japanese, Sui is Japanese for Water ",
            option::some(url::new_unsafe_from_bytes(b"https://api.movepump.com/uploads/aya_with_sui_tear_aa38eb3d00.png")),
            ctx
        );

        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        transfer::public_share_object(metadata);
    }

    #[test_only]
    /// Wrapper of module initializer for testing
    public fun test_init(ctx: &mut TxContext) {
        init(AYA {}, ctx)
    }
}
