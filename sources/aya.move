module aya::aya {
    use sui::option;
    use sui::coin::{Self, TreasuryCap, CoinMetadata};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::url;

    struct AYA has drop {
        dummy_field: bool
    }

    fun init(arg0: AYA, arg1: &mut TxContext) {
        let (v0, v1) = coin::create_currency(
            arg0,
            6,
            b"AYA",
            b"Aya Asagiri",
            b"Aya Asagiri - an Iconic Meme and Character from Magical Girl Site - Tears are Water, Manga is Japanese, Sui is Japanese for Water \n",
            option::some(url::new_unsafe_from_bytes(b"https://api.movepump.com/uploads/aya_with_sui_tear_aa38eb3d00.png")),
            arg1
        );

        transfer::public_transfer(v0, tx_context::sender(arg1));
        transfer::public_share_object(v1);
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init(AYA { dummy_field: false }, ctx)
    }
}
